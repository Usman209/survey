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

            // Find the existing record or create a new one based on flwId, campaignName, and teamNumber
            let collectedData = await CollectedData.findOne({
                flwId,
                'campaignDetails.campaignName': campaignName,
                'campaignDetails.teamNumber': teamNumber
            });

            if (!collectedData) {
                // If no record exists, create a new one
                collectedData = new CollectedData({ 
                    flwId, 
                    submissions: [], 
                    submissionIndex: {}, // Initialize submissionIndex
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

            // Check if the submission for the same date already exists
            const submittedAtDate = new Date(date);
            const submittedAtString = submittedAtDate.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format

            // Find if this submission already exists for the given date
            const existingSubmissionsForDate = collectedData.submissions.filter(submission => {
                const submissionDateStr = submission.submittedAt.toISOString().split('T')[0]; // Compare just the date
                return submissionDateStr === submittedAtString;
            });

            // If a submission for this date exists, check if data is the same
            const existingSubmission = existingSubmissionsForDate.find(submission => {
                return JSON.stringify(submission.data) === JSON.stringify(data);
            });

            // If it exists, skip adding it
            if (!existingSubmission) {
                // Add the submission to the submissions array
                collectedData.submissions.push({ data, submittedAt: submittedAtDate });

                // Initialize submissionIndex if it doesn't exist for the submitted date
                if (!collectedData.submissionIndex) {
                    collectedData.submissionIndex = {};
                }

                if (!collectedData.submissionIndex[submittedAtString]) {
                    collectedData.submissionIndex[submittedAtString] = [];
                }
                
                // Store index of new submission
                collectedData.submissionIndex[submittedAtString].push(collectedData.submissions.length - 1); 
            }

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
    