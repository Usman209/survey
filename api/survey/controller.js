const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');


exports.syncCollectedData = async (req, res) => {
    try {
        console.log(req.body);
        
        const collectedDataArray = req.body; // Array of collected data from the mobile app

        for (const entry of collectedDataArray) {
            const { userData, data, campaign, date } = entry;
            const flwId = userData.id; // Extract flwId from userData
            const { teamNumber, campaignName } = campaign; // Extracting from campaign object

            // Find the existing record based on flwId and campaignName
            let collectedData = await CollectedData.findOne({ flwId, 'campaignDetails.campaignName': campaignName });

            if (!collectedData) {
                // If no record exists, create a new one
                collectedData = new CollectedData({ 
                    flwId, 
                    submissions: [], 
                    campaignDetails: {
                        teamNumber,
                        campaignName,
                        UC: campaign.UC,
                        UCMOName: campaign.UCMOName,
                        AICName: campaign.AICName,
                        day: campaign.day,
                        date: campaign.date,
                        areaName: campaign.areaName,
                        campaignType: campaign.campaignType,
                    }
                });
            }

            // Check if the submission for the same date and data already exists
            const submittedAtDate = new Date(date);
            const existingSubmission = collectedData.submissions.find(submission => {
                return submission.submittedAt.toISOString() === submittedAtDate.toISOString() &&
                       JSON.stringify(submission.data) === JSON.stringify(data);
            });

            // If it exists and has the same userId, skip adding it
            if (existingSubmission) {
                const userExists = existingSubmission.userData && existingSubmission.userData.id === userData.id;
                if (userExists) {
                    continue; // Skip adding if the same userId exists
                }
            }

            // If data is different or the userId is different, add a new submission
            collectedData.submissions.push({ data, submittedAt: submittedAtDate, userData });

            // Save the record
            await collectedData.save();
        }

        return sendResponse(res, 200, "Data synced successfully.");
    } catch (error) {
        return errReturned(res, error.message);
    }
};




// [
//     8|my-app  |   {
//     8|my-app  |     date: '2024-10-20T17:14:01.514Z',
//     8|my-app  |     campaign: {
//     8|my-app  |       UC: 'UC1',
//     8|my-app  |       UCMOName: 'پیٹھی    ',
//     8|my-app  |       AICName: 'ینوراما سنٹر کے باہر ملنے والے لڈو  کی\n ',
//     8|my-app  |       teamNumber: '2565',
//     8|my-app  |       campaignName: 'Camp 40',
//     8|my-app  |       day: '2',
//     8|my-app  |       date: '2024-10-20',
//     8|my-app  |       areaName: 'پیٹھی',
//     8|my-app  |       campaignType: 'NID'
//     8|my-app  |     },
//     8|my-app  |     userData: { id: 1 },
//     8|my-app  |     data: { houses: [], schools: [], streetChildren: [Array] }
//     8|my-app  |   }
//     8|my-app  | ]
//    long
    