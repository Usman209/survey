const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');




exports.syncCollectedData = async (req, res) => {
    try {
        console.log(req.body);
        
        const collectedDataArray = req.body; // Array of collected data from the mobile app

        // Check if the collected data array is empty
        if (!Array.isArray(collectedDataArray) || collectedDataArray.length === 0) {
            return res.status(400).json({ message: 'Data is empty. Please add survey data first before syncing.' });
        }

        for (const entry of collectedDataArray) {
            const { userData, data, campaign, date } = entry;
            const flwId = userData.id; // Extract flwId from userData
            const { teamNumber, campaignName, day } = campaign; // Extracting from campaign object

            // Validate the day value
            if (!day || typeof day !== 'string') {
                console.error('Invalid campaign day:', day);
                return res.status(400).json({ message: 'Invalid campaign day value.' });
            }

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
                        day, // Ensure this is a valid string
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
        console.error('Error syncing data:', error);
        return errReturned(res, error.message);
    }
};


// Helper function to count teams based on submission time
const countTeamsByCutoff = (collectedDataArray, cutoffTime) => {
    const beforeCutoffTeams = new Set();
    const afterCutoffTeams = new Set();

    for (const entry of collectedDataArray) {
        // Get the first submission for each team
        const firstSubmission = entry.submissions[0]; // Assuming submissions are in order

        if (firstSubmission) {
            const submittedAt = new Date(firstSubmission.submittedAt);

            // Check the submission time against cutoff
            if (submittedAt < cutoffTime) {
                beforeCutoffTeams.add(entry.campaignDetails.teamNumber);
            } else {
                afterCutoffTeams.add(entry.campaignDetails.teamNumber);
            }
        }
    }

    return {
        beforeCutoffCount: beforeCutoffTeams.size,
        afterCutoffCount: afterCutoffTeams.size,
    };
};


// Function to count unique teams visiting after 2 PM
const countVisitsAfter2PM = (collectedDataArray) => {
    const visitsAfter2PM = new Set(); // To track unique teams visiting after 2 PM

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const submittedAt = new Date(submission.submittedAt.$date);

            // Check if the submission time is after 2 PM
            if (submittedAt.getHours() >= 14) {
                visitsAfter2PM.add(entry.flwId); // Use flwId to track unique teams
            }
        }
    }

    return visitsAfter2PM.size; // Return the count of unique teams visiting after 2 PM
};


// Function to count unique NA children in houses
const countUniqueNAChildren = (collectedDataArray) => {
    const uniqueHouses = new Map(); // To track unique house numbers

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                // Check if the house type is 'na'
                if (house.type === 'na' && Array.isArray(house.naChildren)) {
                    // Use house number as key for uniqueness
                    if (!uniqueHouses.has(house.houseNumber)) {
                        uniqueHouses.set(house.houseNumber, 0); // Initialize count for this house number
                    }
                    // Count the number of unique naChildren
                    uniqueHouses.set(house.houseNumber, uniqueHouses.get(house.houseNumber) + house.naChildren.length);
                }
            }
        }
    }

    // Return the total count of NA children across unique houses
    return Array.from(uniqueHouses.values()).reduce((acc, count) => acc + count, 0);
};





const countUniqueLockedHouses = (collectedDataArray) => {
    const uniqueLockedHouses = new Set();

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                // Check if the house type is 'locked'
                if (house.houseType === 'locked') {
                    uniqueLockedHouses.add(house.id); // Use house ID to ensure uniqueness
                }
            }
        }
    }

    return uniqueLockedHouses.size; // Return the count of unique locked houses
}


const countRevisitedHouses = (collectedDataArray) => {
    const housesMap = {};

    collectedDataArray.forEach(submission => {
        submission.submissions.forEach(entry => {
            entry.data.houses.forEach(house => {
                
                if (house.houseType === 'locked') {

                    const houseNumber = house.houseNumber;
                    const timestamp = new Date(house.addedAt).getTime(); // Get timestamp in milliseconds

                    // Initialize the house entry if it doesn't exist
                    if (!housesMap[houseNumber]) {
                        housesMap[houseNumber] = {
                            visitTimestamps: [],
                            revisits: 0,
                        };
                    }

                    // Check if this visit is a revisit
                    const isRevisit = housesMap[houseNumber].visitTimestamps.some(existingTimestamp => {
                        return Math.abs(existingTimestamp - timestamp) > 0; // Consider it a revisit if timestamps differ
                    });

                    // Add the timestamp to the list
                    housesMap[houseNumber].visitTimestamps.push(timestamp);

                    // Increment revisit count if it's a revisit
                    if (isRevisit) {
                        housesMap[houseNumber].revisits += 1;
                    }
                }
            });
        });
    });

    // Prepare the final output
    const revisitedHouses = Object.keys(housesMap).map(key => ({
        houseNumber: key,
        revisits: housesMap[key].revisits,
    }));

    return {
        count: revisitedHouses.length,
        revisitedHouses,
    };
};

// Example usage within your existing code
exports.getCollectedData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Date parsing and fetching collected data remains the same
        // ...

        // Call the function to count revisited houses
        const revisitedHouseData = countRevisitedHouses(collectedDataArray);

        // Prepare the response
        return res.status(200).json({
            revisitedHouseCount: revisitedHouseData.count,
            revisitedHouses: revisitedHouseData.revisitedHouses,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




// exports.getCollectedData = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         // Parse the dates or default to the current date
//         const today = new Date();
//         const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
//         const start = startDate ? new Date(startDate) : new Date(currentDate);
//         const end = endDate ? new Date(endDate) : new Date(currentDate);

//         // Set time to the end of the day for end date
//         end.setHours(23, 59, 59, 999);

//         // Fetch collected data for the specified date range
//         const collectedDataArray = await CollectedData.find({
//             'campaignDetails.date': {
//                 $gte: start.toISOString().split('T')[0], // Start date
//                 $lte: end.toISOString().split('T')[0]    // End date
//             }
//         });

//         // Define cutoff time (8:30 AM)
//         const cutoffTime = new Date();
//         cutoffTime.setHours(8, 30, 0, 0); // Set time to 8:30 AM

//         // Call the reusable function to count teams
//         const { beforeCutoffCount, afterCutoffCount } = countTeamsByCutoff(collectedDataArray);

//         const uniqueLockedHouseCount = countUniqueLockedHouses(collectedDataArray);
//         const visitsAfter2PMCount = countVisitsAfter2PM(collectedDataArray);
//         const uniqueNAChildrenCount = countUniqueNAChildren(collectedDataArray);

//         // Check for NA house revisits
//         const revisitedHouses = checkNAHouseRevisited({ submissions: collectedDataArray });

//         // Prepare the response with updated labels
//         return res.status(200).json({
//             "before 8:30": beforeCutoffCount,
//             "after 8:30": afterCutoffCount,
//             "uniqueLockedHouseCount": uniqueLockedHouseCount,
//             "visitsAfter2PMCount": visitsAfter2PMCount,
//             "uniqueNAChildrenCount": uniqueNAChildrenCount,
//             "revisitedHouses": revisitedHouses // Add revisited houses to the response
//         });
//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// };



exports.getCollectedData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Parse the dates or default to the current date
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const start = startDate ? new Date(startDate) : new Date(currentDate);
        const end = endDate ? new Date(endDate) : new Date(currentDate);

        // Set time to the end of the day for end date
        end.setHours(23, 59, 59, 999);

        // Fetch collected data for the specified date range
        const collectedDataArray = await CollectedData.find({
            'campaignDetails.date': {
                $gte: start.toISOString().split('T')[0], // Start date
                $lte: end.toISOString().split('T')[0]    // End date
            }
        });

        // Define cutoff time (8:30 AM)
        const cutoffTime = new Date();
        cutoffTime.setHours(8, 30, 0, 0); // Set time to 8:30 AM

        // Call the reusable function to count teams
        const { beforeCutoffCount, afterCutoffCount } = countTeamsByCutoff(collectedDataArray, cutoffTime);

        const uniqueLockedHouseCount = countUniqueLockedHouses(collectedDataArray);

        const visitsAfter2PMCount = countVisitsAfter2PM(collectedDataArray);


        const uniqueNAChildrenCount = countUniqueNAChildren(collectedDataArray);


        const revisitedHouseData = countRevisitedHouses(collectedDataArray);



        // Prepare the response with updated labels
        return res.status(200).json({
            "before 8:30": beforeCutoffCount,
            "after 8:30": afterCutoffCount,
            "uniqueLockedHouseCount": uniqueLockedHouseCount,
            "visitsAfter2PMCount":visitsAfter2PMCount,
            "uniqueNAChildrenCount":uniqueNAChildrenCount,
            "revisitedHouseData":revisitedHouseData

            
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
