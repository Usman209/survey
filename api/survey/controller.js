const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');

 const mongoose = require('mongoose');
const Team = require('../../lib/schema/team.schema'); 
const User = require('../../lib/schema/users.schema'); 


const NodeCache = require('node-cache');
const cron = require('cron');
    
    // Create a cache instance
    const myCache = new NodeCache({ stdTTL: 900 }); // Cache for 15 minutes



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
        let { userData, data, campaign, date } = entry;

        // Check for required fields
        if (!userData || !data || !campaign) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const userId = userData.id; // Extract userId from userData
        const { teamNumber, campaignName, day } = campaign;

        // Validate the day value
        if (!day || typeof day !== 'string') {
            day = '4'; // Default value
        }

        // Find or create collected data
        let collectedData = await CollectedData.findOne({
            userId,
            'campaignDetails.campaignName': campaignName,
            'campaignDetails.teamNumber': teamNumber
        }) || new CollectedData({
            userId,
            submissions: [],
            submissionIndex: {}, // Initialize submissionIndex here
            campaignDetails: {
                teamNumber,
                campaignName,
                UC: campaign.UC,
                UCMOName: campaign.UCMOName,
                AICName: campaign.AICName,
                day,
                date: campaign.date,
                areaName: campaign.areaName,
                campaignType: campaign.campaignType,
            }
        });

        // Check for existing submissions for the date
        const submittedAtDate = new Date(date);
        const submittedAtString = submittedAtDate.toISOString().split('T')[0];

        // Initialize submissionIndex if it doesn't exist
        if (!collectedData.submissionIndex) {
            collectedData.submissionIndex = {};
        }

        // Check for existing submission
        const existingSubmission = collectedData.submissions.find(submission => {
            const submissionDateStr = submission.submittedAt.toISOString().split('T')[0];
            return submissionDateStr === submittedAtString && JSON.stringify(submission.data) === JSON.stringify(data);
        });

        // If it does not exist, add it
        if (!existingSubmission) {
            collectedData.submissions.push({ data, submittedAt: submittedAtDate });

            // Use the correct initialization for the index
            if (!collectedData.submissionIndex[submittedAtString]) {
                collectedData.submissionIndex[submittedAtString] = [];
            }
            collectedData.submissionIndex[submittedAtString].push(collectedData.submissions.length - 1);
        }

        // Save the record
        await collectedData.save();
        return res.status(200).json({ message: 'Data processed successfully.' });

    } catch (error) {
        console.error('Error handling FLW entry:', error);
        return res.status(500).json({ message: error.message });
    }
};


exports.syncCollectedData = async (req, res) => {
    try {

        console.log(req.body);
        
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


const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

const getRevisitedLockedHousesInfo = (collectedDataArray) => {
    const uniqueRevisitedHouses = new Set();
    const revisitedHousesDetails = [];
    const currentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                const addedAtDate = house.addedAt ? new Date(house.addedAt).toISOString().split('T')[0] : null;
                const updatedAtDate = house.updatedAt ? new Date(house.updatedAt).toISOString().split('T')[0] : null;

                // Check if the house type is 'locked' and added/updated today
                if (house.houseType === 'locked' && (addedAtDate === currentDate || updatedAtDate === currentDate)) {
                    if (!uniqueRevisitedHouses.has(house.id)) {
                        uniqueRevisitedHouses.add(house.id);
                        revisitedHousesDetails.push(house); // Add the house details
                    }
                }
                
                // Check if the house was first 'locked' and updated to a different status today
                if (house.previousHouseType === 'locked' && updatedAtDate === currentDate && house.houseType !== 'locked') {
                    if (!uniqueRevisitedHouses.has(house.id)) {
                        uniqueRevisitedHouses.add(house.id);
                        revisitedHousesDetails.push(house); // Add the house details
                    }
                }
            }
        }
    }

    return {
        count: revisitedHousesDetails.length, // Count of revisited houses
        details: revisitedHousesDetails // Array of house details
    };
};


const getNotVisitedLockedHousesInfo = (collectedDataArray) => {
    const uniqueNotVisitedHouses = new Set();
    const notVisitedHousesDetails = [];
    const currentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                const addedAtDate = house.addedAt ? new Date(house.addedAt).toISOString().split('T')[0] : null;
                const updatedAtDate = house.updatedAt ? new Date(house.updatedAt).toISOString().split('T')[0] : null;

                // Check if the house does not match the 'visited' criteria
                const isNotVisited = !(
                    (house.houseType === 'locked' && (addedAtDate === currentDate || updatedAtDate === currentDate)) ||
                    (house.previousHouseType === 'locked' && updatedAtDate === currentDate && house.houseType !== 'locked')
                );

                if (isNotVisited) {
                    if (!uniqueNotVisitedHouses.has(house.id)) {
                        uniqueNotVisitedHouses.add(house.id);
                        notVisitedHousesDetails.push(house); // Add the house details
                    }
                }
            }
        }
    }

    return {
        count: notVisitedHousesDetails.length, // Count of not visited houses
        details: notVisitedHousesDetails // Array of house details
    };
};



const countCoveredNAChildren = (collectedDataArray) => {
    const currentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
    const coveredChildrenCount = new Map(); // To track covered children by house ID

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                const addedAtDate = house.addedAt ? new Date(house.addedAt).toISOString().split('T')[0] : null;

                // Only process houses added today
                if (addedAtDate === currentDate) {
                    const families = house.families || [];

                    // Iterate over families to convert string counts to numbers
                    families.forEach(family => {
                        const naChildren0to11 = parseInt(family.NAChildren0to11, 10) || 0; // Convert to number
                        const naChildren11to59 = parseInt(family.NAChildren11to59, 10) || 0; // Convert to number

                        // Get house ID
                        const houseId = house.id;

                        // Initialize if not already present
                        if (!coveredChildrenCount.has(houseId)) {
                            coveredChildrenCount.set(houseId, {
                                covered0to11: 0,
                                covered11to59: 0
                            });
                        }

                        const currentCount = coveredChildrenCount.get(houseId);

                        // Increment covered counts based on NAChildren values
                        if (naChildren0to11 > 0) {
                            currentCount.covered0to11 += naChildren0to11; // Increment covered count for 0-11 age group
                        }

                        if (naChildren11to59 > 0) {
                            currentCount.covered11to59 += naChildren11to59; // Increment covered count for 11-59 age group
                        }

                        // Update the count in the map
                        coveredChildrenCount.set(houseId, currentCount);
                    });
                }
            }
        }
    }

    // Prepare results with total count
    const results = [];
    let totalCoveredChildren = 0;

    for (const [houseId, counts] of coveredChildrenCount.entries()) {
        const totalForHouse = counts.covered0to11 + counts.covered11to59; // Calculate total for this house
        totalCoveredChildren += totalForHouse; // Increment overall total

        results.push({
            houseId,
            coveredChildren0to11: counts.covered0to11,
            coveredChildren11to59: counts.covered11to59,
            totalCoveredChildren: totalForHouse // Add total for this house
        });
    }

    return {
        results, // Return the array of covered children counts by house
        totalCoveredChildren // Return the overall total
    };
};

function getTotalCounts(collectedDataArray) {
    let totalAFPCaseCount = 0;
    let totalZeroDoseCount = 0;
    let totalNewbornCount = 0;
    const processedHouseIds = new Set(); // To track unique house IDs

    collectedDataArray.forEach(data => {
        if (data.submissions) {
            data.submissions.forEach(submission => {
                if (submission.data && Array.isArray(submission.data.houses)) {
                    submission.data.houses.forEach(house => {
                        // Check if the house has already been processed
                        if (house.houseType === 'house' && !processedHouseIds.has(house.id)) {
                            processedHouseIds.add(house.id); // Mark this house as processed
                            
                            // Sum the counts, ensuring to convert to numbers
                            totalAFPCaseCount += Number(house.AFPCaseCount) || 0; 
                            totalZeroDoseCount += Number(house.zeroDoseCount) || 0; 
                            totalNewbornCount += Number(house.newbornCount) || 0; 
                        }
                    });
                }
            });
        }
    });

    return {
        totalAFPCaseCount,
        totalZeroDoseCount,
        totalNewbornCount
    };
}











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
//         const { beforeCutoffCount, afterCutoffCount } = countTeamsByCutoff(collectedDataArray, cutoffTime);

//         const uniqueLockedHouseCount = countUniqueLockedHouses(collectedDataArray);

//         const visitsAfter2PMCount = countVisitsAfter2PM(collectedDataArray);


//         const uniqueNAChildrenCount = countUniqueNAChildren(collectedDataArray);


//         const revisitedHouseData = countRevisitedHouses(collectedDataArray);

//         const refusalStats = getRefusalHouseStats(collectedDataArray);


// // total : sum of these 4 

//         const school = getTotalVaccinatedStudents(collectedDataArray)

//         const street = getTotalStreetChildrenCount(collectedDataArray)

//         const guestChild= getTotalGuestChildrenCount(collectedDataArray)
//         const avaibleChild= getTotalAvailableChildrenCount(collectedDataArray)

//         const total = school + street + guestChild + avaibleChild;



    

//         // Prepare the response with updated labels
//         return res.status(200).json({
//             "before 8:30": beforeCutoffCount,
//             "after 8:30": afterCutoffCount,
//             "uniqueLockedHouseCount": uniqueLockedHouseCount,
//             "visitsAfter2PMCount":visitsAfter2PMCount,
//             "uniqueNAChildrenCount":uniqueNAChildrenCount,
//             "revisitedHouseData":revisitedHouseData,
//             "refusalStats":refusalStats,
//             "school":school,
//             "street":street,
//             "guestChild":guestChild,
//             "avaibleChild":avaibleChild,
//             "total":total  
//         });
//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// }
    
    // Set up a cron job to clear the cache every 15 minutes
   
   

    
    
    // Set up a cron job to clear the cache every 15 minutes
    const job = new cron.CronJob('*/30 * * * *', () => {
        myCache.flushAll();
    });
    job.start();
    
    exports.getCollectedData = async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
    
            // Generate a cache key based on the input parameters
            const cacheKey = `collectedData-${startDate || 'default'}-${endDate || 'default'}`;
    
            // Check if the data is already cached
            const cachedData = myCache.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(cachedData);
            }
    
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
                    $gte: start.toISOString().split('T')[0],
                    $lte: end.toISOString().split('T')[0]
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
    
            // Total calculations
            const school = getTotalVaccinatedStudents(collectedDataArray);
            const street = getTotalStreetChildrenCount(collectedDataArray);
            const guestChild = getTotalGuestChildrenCount(collectedDataArray);
            const availableChild = getTotalAvailableChildrenCount(collectedDataArray);
            const total = school + street + guestChild + availableChild;

            
            const visitedResult = getRevisitedLockedHousesInfo(collectedDataArray);

            const getNotVisitedLockedHouses = getNotVisitedLockedHousesInfo(collectedDataArray)

            const coveredChildrenInfo = countCoveredNAChildren(collectedDataArray);

            const totals = getTotalCounts(collectedDataArray);

            const result= await getDistinctUserIdsForCurrentDate();
            



    
            // Prepare the response
            const responseData = {
                "before 8:30": beforeCutoffCount,
                "after 8:30": afterCutoffCount,
                "uniqueLockedHouseCount": uniqueLockedHouseCount,
                "visitsAfter2PMCount": visitsAfter2PMCount,
                "uniqueNAChildrenCount": uniqueNAChildrenCount,
                "revisitedHouseData": revisitedHouseData,
                "refusalStats": refusalStats,
                "school": school,
                "street": street,
                "guestChild": guestChild,
                "availableChild": availableChild,
                "total": total,
                "Na Housenot visted same day":  visitedResult.count,
                "Na Housenot Not visted same day":  getNotVisitedLockedHouses.count,
                "covered NA Children same day":coveredChildrenInfo.totalCoveredChildren,
                "Total AFP Case":totals.totalAFPCaseCount,
                "Total Zero Dose Count": totals.totalZeroDoseCount,
                "Total Newborn Count": totals.totalNewbornCount,
                "ucmo %":result.ucmoPercentage,
                "aic %":result.aicPercentage,



            };
    
            // Store the response in cache
            myCache.set(cacheKey, responseData);
    
            return res.status(200).json(responseData);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    };
       
    // const getDistinctUserIdsForCurrentDate = async () => {
    //     // Get the current date's start and end in UTC
    //     const startOfDayUTC = moment.utc().startOf('day');
    //     const endOfDayUTC = moment.utc().endOf('day');
      
    //     console.log('Start of Day (UTC):', startOfDayUTC.toISOString());
    //     console.log('End of Day (UTC):', endOfDayUTC.toISOString());
      
    //     try {
    //       // Query for records created today in UTC
    //       const collectedDataRecords = await CollectedData.find({
    //         createdAt: { $gte: startOfDayUTC.toDate(), $lt: endOfDayUTC.toDate() }
    //       });
      
    //       console.log('Collected Data Records:', collectedDataRecords);
      
    //       // Extract distinct userIds
    //       const userIds = Array.from(new Set(collectedDataRecords.map(record => record.userId.toString())));
    //       console.log('Distinct User IDs:', userIds);
          
    //       return userIds;
    //     } catch (error) {
    //       console.error("Error fetching collected data:", error);
    //     }
    //   };



    const getDistinctUserIdsForCurrentDate = async () => {
      // Get the current date's start and end in UTC
      const startOfDayUTC = moment.utc().startOf('day');
      const endOfDayUTC = moment.utc().endOf('day');
    
      console.log('Start of Day (UTC):', startOfDayUTC.toISOString());
      console.log('End of Day (UTC):', endOfDayUTC.toISOString());
    
      try {
        // Query for records created today in UTC
        const collectedDataRecords = await CollectedData.find({
          createdAt: { $gte: startOfDayUTC.toDate(), $lt: endOfDayUTC.toDate() }
        });
    
    
        // Extract distinct userIds from CollectedData
        const userIds = Array.from(new Set(collectedDataRecords.map(record => record.userId.toString())));
    
        // Query Users based on the extracted user IDs
        const users = await User.find({
          _id: { $in: userIds },
          $or: [{ role: 'UCMO' }, { role: 'AIC' }]
        });
    
        // Create arrays for UCMO and AIC IDs from users
        const collectedUCMOIds = users.filter(user => user.role === 'UCMO').map(user => user._id.toString());
        const collectedAICIds = users.filter(user => user.role === 'AIC').map(user => user._id.toString());
    
       
    
        // // Step 1: Retrieve teams
        // const teams = await Team.find({}); // Adjust the query as needed
    
        // // Step 2: Extract distinct UCMO and AIC IDs from teams
        // const ucmoIdsFromTeams = new Set();
        // const aicIdsFromTeams = new Set();
    
        // teams.forEach(team => {
        //   if (team.ucmo) {
        //     ucmoIdsFromTeams.add(team.ucmo.toString());
        //   }
        //   if (team.aic) {
        //     aicIdsFromTeams.add(team.aic.toString());
        //   }
        // });
    
     
        // Get lengths of each array
        const collectedUCMOIdsLength = collectedUCMOIds.length;
        const collectedAICIdsLength = collectedAICIds.length;
        // const ucmoIdsFromTeamsLength = ucmoIdsFromTeams.size; // Use size for Set 245
        // const aicIdsFromTeamsLength = aicIdsFromTeams.size; // Use size for Set  923

        const ucmoIdsFromTeamsLength = 250; // Use size for Set 245
        const aicIdsFromTeamsLength = 930; // Use size for Set  923


        const ucmoPercentage = ucmoIdsFromTeamsLength > 0 
        ? ((collectedUCMOIdsLength / ucmoIdsFromTeamsLength) * 100).toFixed(2) 
        : '0.00'; // Return '0.00' as a string for consistent formatting
      
      const aicPercentage = aicIdsFromTeamsLength > 0 
        ? ((collectedAICIdsLength / aicIdsFromTeamsLength) * 100).toFixed(2) 
        : '0.00'; // Similarly format AIC percentage


    
        // Combine results including lengths
        return {
            ucmoPercentage,
            aicPercentage
          
        };
      } catch (error) {
        console.error("Error fetching collected data or users:", error);
      }
    };
    
 