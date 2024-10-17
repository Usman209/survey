const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');



exports.syncCollectedData = async (req, res) => {
    try {
        const collectedDataArray = req.body; // Assume this is the array of collected data from the mobile app

        for (const entry of collectedDataArray) {
            const { flwId, teamId, teamNumber, campaignName, data, date } = entry;

            // Find the existing record or create a new one based on teamId and campaignName
            let collectedData = await CollectedData.findOne({ flwId, teamId, campaignName });

            if (!collectedData) {
                // If no record exists, create a new one
                collectedData = new CollectedData({ flwId, teamId, teamNumber, campaignName, submissions: [] });
            }

            // Check if the submission for the same date already exists
            const submittedAtDate = new Date(date);
            const existingSubmission = collectedData.submissions.find(submission => {
                return submission.submittedAt.toISOString() === submittedAtDate.toISOString() &&
                       JSON.stringify(submission.data) === JSON.stringify(data);
            });

            // If it exists, skip adding it
            if (!existingSubmission) {
                collectedData.submissions.push({ data, submittedAt: submittedAtDate });
            }

            // Save the record
            await collectedData.save();
        }

        return sendResponse(res, 200, "Data synced successfully.");
    } catch (error) {
        return errReturned(res, error.message);
    }
};