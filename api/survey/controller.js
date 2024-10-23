const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');



// Helper function for AIC and UCMO roles
const handleAICUCMO = async (collectedDataArray) => {
    // Check if the collected data array is empty
    if (!Array.isArray(collectedDataArray) || collectedDataArray.length === 0) {
        throw new Error('Data is empty. Please add survey data first before syncing.');
    }

    // console.log(collectedDataArray);
    

    // Extract the first UCMOCampaign entry
    const ucmoCampaign = collectedDataArray[0].UCMOCampaign;

    if (!Array.isArray(ucmoCampaign) || ucmoCampaign.length === 0) {
        throw new Error('UCMOCampaign is empty. Please add campaign data first.');
    }

    // Assuming you want to use the first campaign entry
    const campaignDetails = ucmoCampaign[0];

    // Extracting campaign details
    const { teamNumber, UCMOName, UCMOId, workDay } = campaignDetails; // Get workDay

    // Validate the day value
    if (!workDay || typeof workDay !== 'string') {
        console.error('Invalid campaign day:', workDay);
        throw new Error('Invalid campaign day value. It must be a non-empty string.');
    }

    for (const entry of collectedDataArray) {
        const { userData, data, date } = entry;
        const userId = userData.id; // Extract userId from userData

        // Find or create collected data record
        let collectedData = await CollectedData.findOne({
            userId,
            'campaignDetails.campaignName': campaignDetails.campaignName,
            'campaignDetails.teamNumber': teamNumber
        });

        if (!collectedData) {
            collectedData = new CollectedData({ 
                userId, 
                submissions: [], 
                submissionIndex: {},
                campaignDetails: {
                    teamNumber,
                    campaignName: campaignDetails.campaignName,
                    UC: campaignDetails.UC,
                    UCMOName,
                    UCMOId,
                    day: workDay, // Ensure this is the correct value
                    date: campaignDetails.date,
                    areaName: campaignDetails.areaName,
                    campaignType: campaignDetails.campaignType,
                }
            });
        }

        await processSubmission(collectedData, data, date);
    }
};

// Function to process submissions
const processSubmission = async (collectedData, data, date) => {
    const submittedAtDate = new Date(date);
    const submittedAtString = submittedAtDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check for existing submission
    const existingSubmissionsForDate = collectedData.submissions.filter(submission => {
        const submissionDateStr = submission.submittedAt.toISOString().split('T')[0];
        return submissionDateStr === submittedAtString;
    });

    // Check if the data is the same
    const existingSubmission = existingSubmissionsForDate.find(submission => {
        return JSON.stringify(submission.data) === JSON.stringify(data);
    });

    // If it exists, skip adding it
    if (!existingSubmission) {
        collectedData.submissions.push({ data, submittedAt: submittedAtDate });

        // Initialize submissionIndex if it doesn't exist
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
};

const handleFLW = async (entry, res) => {
    try {
        const { userData, data, campaign, date } = entry;

        // Check for required fields
        if (!userData) {
            throw new Error('User data is missing in entry: ' + JSON.stringify(entry));
        }
        if (!data) {
            throw new Error('Data is missing in entry: ' + JSON.stringify(entry));
        }
        if (!campaign) {
            throw new Error('Campaign is missing in entry: ' + JSON.stringify(entry));
        }

        const userId = userData.id; // Extract userId from userData
        const { teamNumber, campaignName, day } = campaign; // Extracting from campaign object

        // Validate the day value
        if (!day || typeof day !== 'string') {
            throw new Error('Invalid campaign day value in entry: ' + JSON.stringify(entry));
        }

        // Find the existing record or create a new one based on userId, campaignName, and teamNumber
        let collectedData = await CollectedData.findOne({
            userId,
            'campaignDetails.campaignName': campaignName,
            'campaignDetails.teamNumber': teamNumber
        });

        if (!collectedData) {
            // If no record exists, create a new one
            collectedData = new CollectedData({ 
                userId, 
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
    } catch (error) {
        console.error('Error handling FLW entry:', error);
        return res.status(500).json({ message: error.message });
    }
};

exports.syncCollectedData = async (req, res) => {
    try {
        const collectedDataArray = req.body; // Array of collected data from the mobile app

        // Check if the collected data array is empty
        if (!Array.isArray(collectedDataArray) || collectedDataArray.length === 0) {
            return res.status(400).json({ message: 'Data is empty. Please add survey data first before syncing.' });
        }

        // Log the incoming data for debugging
        console.log('Collected Data Array:', JSON.stringify(collectedDataArray, null, 2));

        const userRole = collectedDataArray[0].userData.role; // Assuming role is in userData

        if (userRole === 'AIC' || userRole === 'UCMO') {
            await handleAICUCMO(collectedDataArray);
        } else if (userRole === 'FLW') {
            for (const entry of collectedDataArray) {
                await handleFLW(entry, res);
            }
        } else {
            return res.status(400).json({ message: 'Invalid user role.' });
        }

        return sendResponse(res, 200, "Data synced successfully.");
    } catch (error) {
        console.error('Error syncing data:', error);
        return res.status(500).json({ message: error.message });
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
                visitsAfter2PM.add(entry.userId); // Use userId to track unique teams
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

    // Return only the count of revisited houses
    const revisitedHouseCount = Object.values(housesMap).reduce((total, house) => {
        return total + (house.revisits > 0 ? 1 : 0); // Count houses with at least one revisit
    }, 0);

    return revisitedHouseCount;
};


const getRefusalHouseStats = (collectedDataArray) => {
    const refusalStats = {
        totalRefusalCount: 0,
        refusalReasons: {}
    };

    const countedHouses = new Set(); // To track counted house numbers

    collectedDataArray.forEach(collectedData => {
        collectedData.submissions.forEach(submission => {
            submission.data.houses.forEach(house => {
                if (house.houseType === 'refusal') {
                    const houseNumber = house.houseNumber; // Use house number to avoid duplicates

                    // Only count if this house number hasn't been counted yet
                    if (!countedHouses.has(houseNumber)) {
                        countedHouses.add(houseNumber); // Mark this house number as counted

                        // Increment the total refusal count
                        refusalStats.totalRefusalCount += 1;

                        // Get the refusal reason
                        const reason = house.refusalReason || 'unknown';

                        // Update the refusalReasons object
                        if (!refusalStats.refusalReasons[reason]) {
                            refusalStats.refusalReasons[reason] = 0;
                        }
                        refusalStats.refusalReasons[reason] += 1;
                    }
                }
            });
        });
    });

    return refusalStats;
};


const getTotalVaccinatedStudents = (collectedDataArray) => {
    const vaccinatedStudentsSet = new Set(); // To track distinct schools
    let totalVaccinatedStudents = 0;

    collectedDataArray.forEach(collectedData => {
        collectedData.submissions.forEach(submission => {
            submission.data.schools.forEach(school => {
                const schoolId = school.id; // Assuming each school has a unique ID

                // Only add to the total if this school ID hasn't been counted yet
                if (!vaccinatedStudentsSet.has(schoolId)) {
                    vaccinatedStudentsSet.add(schoolId); // Mark this school as counted

                    // Convert polioVaccinatedStudents to a number and add to the total
                    const vaccinatedCount = parseInt(school.polioVaccinatedStudents, 10) || 0; // Default to 0 if NaN
                    totalVaccinatedStudents += vaccinatedCount;
                }
            });
        });
    });

    return totalVaccinatedStudents;
};


const getTotalStreetChildrenCount = (collectedDataArray) => {
    try {
        let totalStreetChildrenCount = 0;

        // Iterate through each submission in the collected data
        collectedDataArray.forEach(data => {
            data.submissions.forEach(submission => {
                // Sum the count of street children
                submission.data.streetChildren.forEach(streetChild => {
                    totalStreetChildrenCount += streetChild.count || 0; // Ensure count is treated as a number
                });
            });
        });

        return totalStreetChildrenCount; // Return the total count
    } catch (error) {
        console.error(error);
        return null; // Return null in case of error
    }
};



function getTotalGuestChildrenCount(collectedDataArray) {
    let totalGuestChildren = 0;
    const processedHouseIds = new Set(); // To track unique house IDs

    collectedDataArray.forEach(data => {
        if (data.submissions) {
            data.submissions.forEach(submission => {
                if (submission.data && Array.isArray(submission.data.houses)) {
                    submission.data.houses.forEach(house => {
                        // Check if the house has already been processed
                        if (house.houseType === 'house' && !processedHouseIds.has(house.id)) {
                            processedHouseIds.add(house.id); // Mark this house as processed
                            
                            if (Array.isArray(house.families)) {
                                house.families.forEach(family => {
                                    // Convert string value to number and add to total
                                    const availableGuestChildrenCount = Number(family.availableGuestChildrenCount) || 0; 
                                    totalGuestChildren += availableGuestChildrenCount; // Add to total
                                });
                            }
                        }
                    });
                }
            });
        }
    });

    return totalGuestChildren;
}


function getTotalAvailableChildrenCount(collectedDataArray) {
    let totalAvailableChildren = 0;
    const processedHouseIds = new Set(); // To track unique house IDs

    collectedDataArray.forEach((data) => {
        if (data.submissions) {
            data.submissions.forEach((submission) => {
                if (submission.data && Array.isArray(submission.data.houses)) {
                    submission.data.houses.forEach((house) => {
                        // Check if the house has already been processed
                        if (house.houseType === 'house' && !processedHouseIds.has(house.id)) {
                            processedHouseIds.add(house.id); // Mark this house as 
                                                  
                            if (Array.isArray(house.families)) {
                                house.families.forEach((family) => {
                                    // Convert string values to numbers
                                    const availableChildren0to11 = Number(family.availableChildren0to11) || 0;
                                    const availableChildren11to59 = Number(family.availableChildren11to59) || 0;

                                    // Add available children counts
                                    totalAvailableChildren += availableChildren0to11 + availableChildren11to59;
                                });
                            }
                        }
                    });
                }
            });
        }
    });

    return totalAvailableChildren;
}

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

        const refusalStats = getRefusalHouseStats(collectedDataArray);


// total : sum of these 4 

        const school = getTotalVaccinatedStudents(collectedDataArray)

        const street = getTotalStreetChildrenCount(collectedDataArray)

        const guestChild= getTotalGuestChildrenCount(collectedDataArray)
        const avaibleChild= getTotalAvailableChildrenCount(collectedDataArray)

        const total = school + street + guestChild + avaibleChild;



    

        // Prepare the response with updated labels
        return res.status(200).json({
            "before 8:30": beforeCutoffCount,
            "after 8:30": afterCutoffCount,
            "uniqueLockedHouseCount": uniqueLockedHouseCount,
            "visitsAfter2PMCount":visitsAfter2PMCount,
            "uniqueNAChildrenCount":uniqueNAChildrenCount,
            "revisitedHouseData":revisitedHouseData,
            "refusalStats":refusalStats,
            "school":school,
            "street":street,
            "guestChild":guestChild,
            "avaibleChild":avaibleChild,
            "total":total  
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
