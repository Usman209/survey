const CollectedData = require('../../lib/schema/data.schema'); // Adjust the path as needed
const moment = require('moment'); // To handle date formatting
const { sendResponse, errReturned } = require('../../lib/utils/dto');


// Models for each record type
const House = require('../../lib/schema/house.schema');
const School = require('../../lib/schema/school.schema');
const StreetChildren = require('../../lib/schema/street.schema');

const mongoose = require('mongoose');
const Team = require('../../lib/schema/team.schema');
const User = require('../../lib/schema/users.schema');

const NodeCache = require('node-cache');
const cron = require('cron');
const bullMaster = require('bull-master');
const fs = require('fs');
const path = require('path');



// Create a cache instance
const Queue = require('bull');

// Cache configuration
const myCache = new NodeCache({ stdTTL: 900 }); // Cache for 15 minutes

// Redis configuration
const redisOptions = {
    host: 'localhost',
    port: 6379,
    lifo: false,
    removeOnComplete: true,
    removeOnFail: true
};

// Bull Queue setup
const syncDataQueue = new Queue('syncDataQueue', { redis: redisOptions });

// Bull Master setup
const bullMasterApp = bullMaster({
    queues: [syncDataQueue],
});

bullMasterApp.getQueues();
bullMasterApp.setQueues([syncDataQueue]);


async function insertDataToCollection(collectionName, data) {
    try {
        const collection = mongoose.connection.collection(collectionName);

        // Loop through each record and insert individually
        for (const record of data) {
            try {
                // Add `isProcessed: false` to each record
                const processedRecord = {
                    ...record,
                    isProcessed: false,  // Add the "isProcessed" flag
                };

                // Insert each record individually using insertOne
                const result = await collection.insertOne(processedRecord);

            } catch (error) {
                console.error(`Error inserting record into ${collectionName}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in insertDataToCollection:', error);
    }
}


exports.syncCollectedData = async (req, res) => {
    try {
        const { data } = req.body;
        // const { data } = collectedDataArray;

        // Destructure the arrays from the data object
        const { 
            houses, 
            schools, 
            streetChildren, 
            checkListForm84, 
            checkListNA, 
            checkListLock, 
            checkList00,
            fixedSite,   // Newly added object
            Trsite       // Newly added object
        } = data;

        // Validation checks: Ensure data is not empty for the arrays
        if (
            (!houses || houses.length === 0) && 
            (!schools || schools.length === 0) && 
            (!streetChildren || streetChildren.length === 0) &&
            (!checkListForm84 || checkListForm84.length === 0) &&
            (!checkListNA || checkListNA.length === 0) &&
            (!checkListLock || checkListLock.length === 0) &&
            (!checkList00 || checkList00.length === 0) &&
            !(fixedSite || Trsite)  // Validate that at least one of fixedSite or Trsite is provided
        ) {
            return res.status(400).json({ 
                message: 'Data is empty. Please provide data to sync.' 
            });
        }

        // Send immediate response
        const response = {
            message: 'Data received. We will process your records soon.',
            code: 200
        };
        res.status(200).json(response);

        // Get the current date in YYYY-MM-DD format
        const currentDate = moment().format('YYYY-MM-DD');

        // Add the job to the queue for processing
        await syncDataQueue.add({
            houses,
            schools,
            streetChildren,
            checkListForm84,
            checkListNA,
            checkListLock,
            checkList00,
            fixedSite,   // Pass the fixedSite object
            Trsite,      // Pass the Trsite object
            currentDate
        });

        console.log('Data successfully queued for processing');

    } catch (error) {
        console.error('Error in syncCollectedData:', error);
        if (!res.headersSent) {
            return res.status(500).json({ 
                message: 'An error occurred while processing your request.' 
            });
        }
    }
};

syncDataQueue.process(5, async (job) => {
    try {
        const { houses, schools, streetChildren, checkListForm84, checkListNA, checkListLock, checkList00, currentDate,fixedSite,Trsite } = job.data;

        // Function to add isProcessed: false to each object if the array is not empty
        const addIsProcessedField = (dataArray) => {
            if (dataArray && dataArray.length > 0) {
                return dataArray.map(item => ({
                    ...item,
                    isProcessed: false // Adding the field isProcessed: false to every object
                }));
            }
            return dataArray;  // Return the array as is if it's empty
        };

        // Handle house data
        if (houses && houses.length > 0) {
            const houseCollectionName = `house_${currentDate}`;
            const processedHouses = addIsProcessedField(houses);  // Add isProcessed field to each house if the array is not empty
            for (let house of processedHouses) {
                const houseData = {
                    ...house,
                    addedAt: new Date(house.addedAt),  // Ensure addedAt is in correct format
                    updatedAt: new Date(house.updatedAt || house.addedAt), // Ensure updatedAt is also set
                    campaignId: new mongoose.Types.ObjectId(house.campaignId), // Ensure campaignId is a valid ObjectId
                    user: house.user ? {
                        ...house.user,
                        id: new mongoose.Types.ObjectId(house.user.id) // Ensure user ID is a valid ObjectId
                    } : null
                };
                await insertDataToCollection(houseCollectionName, [houseData]);
            }
        }

        // Handle school data
        if (schools && schools.length > 0) {
            const schoolCollectionName = `school_${currentDate}`;
            const processedSchools = addIsProcessedField(schools);  // Add isProcessed field to each school if the array is not empty
            for (let school of processedSchools) {
                const schoolData = {
                    ...school,
                    addedAt: new Date(school.addedAt),
                    updatedAt: new Date(school.updatedAt || school.addedAt),
                    campaignId: new mongoose.Types.ObjectId(school.campaignId),
                    user: school.user ? {
                        ...school.user,
                        id: new mongoose.Types.ObjectId(school.user.id)
                    } : null
                };
                await insertDataToCollection(schoolCollectionName, [schoolData]);
            }
        }

        // Handle street children data
        if (streetChildren && streetChildren.length > 0) {
            const streetChildrenCollectionName = `streetChildren_${currentDate}`;
            const processedStreetChildren = addIsProcessedField(streetChildren);  // Add isProcessed field to each street child if the array is not empty
            for (let streetChild of processedStreetChildren) {
                const streetChildrenData = {
                    ...streetChild,
                    addedAt: new Date(streetChild.addedAt),
                    updatedAt: new Date(streetChild.updatedAt || streetChild.addedAt),
                    campaignId: new mongoose.Types.ObjectId(streetChild.campaignId),
                    user: streetChild.user ? {
                        ...streetChild.user,
                        id: new mongoose.Types.ObjectId(streetChild.user.id)
                    } : null
                };
                await insertDataToCollection(streetChildrenCollectionName, [streetChildrenData]);
            }
        }

        // Handle checkListForm84 data
        if (checkListForm84 && checkListForm84.length > 0) {
            const checkListForm84CollectionName = `checkListForm84_${currentDate}`;
            const processedCheckListForm84 = addIsProcessedField(checkListForm84);  // Add isProcessed field to each checklist form 84 item if the array is not empty
            for (let entry of processedCheckListForm84) {
                const checkListForm84Data = {
                    ...entry,
                    addedAt: new Date(entry.addedAt),
                    updatedAt: new Date(entry.updatedAt || entry.addedAt),
                    campaignId: new mongoose.Types.ObjectId(entry.campaignId),
                    user: entry.user ? {
                        ...entry.user,
                        id: new mongoose.Types.ObjectId(entry.user.id)
                    } : null
                };
                await insertDataToCollection(checkListForm84CollectionName, [checkListForm84Data]);
            }
        }

        // Handle checkListNA data
        if (checkListNA && checkListNA.length > 0) {
            const checkListNACollectionName = `checkListNA_${currentDate}`;
            const processedCheckListNA = addIsProcessedField(checkListNA);  // Add isProcessed field to each checklist NA item if the array is not empty
            for (let entry of processedCheckListNA) {
                const checkListNAData = {
                    ...entry,
                    addedAt: new Date(entry.addedAt),
                    updatedAt: new Date(entry.updatedAt || entry.addedAt),
                    campaignId: new mongoose.Types.ObjectId(entry.campaignId),
                    user: entry.user ? {
                        ...entry.user,
                        id: new mongoose.Types.ObjectId(entry.user.id)
                    } : null
                };
                await insertDataToCollection(checkListNACollectionName, [checkListNAData]);
            }
        }

        // Handle checkListLock data
        if (checkListLock && checkListLock.length > 0) {
            const checkListLockCollectionName = `checkListLock_${currentDate}`;
            const processedCheckListLock = addIsProcessedField(checkListLock);  // Add isProcessed field to each checklist lock item if the array is not empty
            for (let entry of processedCheckListLock) {
                const checkListLockData = {
                    ...entry,
                    addedAt: new Date(entry.addedAt),
                    updatedAt: new Date(entry.updatedAt || entry.addedAt),
                    campaignId: new mongoose.Types.ObjectId(entry.campaignId),
                    user: entry.user ? {
                        ...entry.user,
                        id: new mongoose.Types.ObjectId(entry.user.id)
                    } : null
                };
                await insertDataToCollection(checkListLockCollectionName, [checkListLockData]);
            }
        }

        // Handle checkList00 data
        if (checkList00 && checkList00.length > 0) {
            const checkList00CollectionName = `checkList00_${currentDate}`;
            const processedCheckList00 = addIsProcessedField(checkList00);  // Add isProcessed field to each checklist 00 item if the array is not empty
            for (let entry of processedCheckList00) {
                const checkList00Data = {
                    ...entry,
                    addedAt: new Date(entry.addedAt),
                    updatedAt: new Date(entry.updatedAt || entry.addedAt),
                    campaignId: new mongoose.Types.ObjectId(entry.campaignId),
                    user: entry.user ? {
                        ...entry.user,
                        id: new mongoose.Types.ObjectId(entry.user.id)
                    } : null
                };
                await insertDataToCollection(checkList00CollectionName, [checkList00Data]);
            }
        }

 // Handle fixedSite data
 if (fixedSite && fixedSite.length > 0) {
    const fixedSiteCollectionName = `fixedSite_${currentDate}`;
    const processedFixedSite = addIsProcessedField(fixedSite);  // Add isProcessed field to each fixedSite if the array is not empty
    for (let site of processedFixedSite) {
        const fixedSiteData = {
            ...site,
            addedAt: new Date(site.addedAt),
            updatedAt: new Date(site.updatedAt || site.addedAt),
            campaignId: new mongoose.Types.ObjectId(site.campaignId),
            user: site.user ? {
                ...site.user,
                id: new mongoose.Types.ObjectId(site.user.id)
            } : null
        };
        await insertDataToCollection(fixedSiteCollectionName, [fixedSiteData]);
    }
}

// Handle Trsite data
if (Trsite && Trsite.length > 0) {
    const trsiteCollectionName = `Trsite_${currentDate}`;
    const processedTrsite = addIsProcessedField(Trsite);  // Add isProcessed field to each Trsite if the array is not empty
    for (let site of processedTrsite) {
        const trsiteData = {
            ...site,
            addedAt: new Date(site.addedAt),
            updatedAt: new Date(site.updatedAt || site.addedAt),
            campaignId: new mongoose.Types.ObjectId(site.campaignId),
            user: site.user ? {
                ...site.user,
                id: new mongoose.Types.ObjectId(site.user.id)
            } : null
        };
        await insertDataToCollection(trsiteCollectionName, [trsiteData]);
    }
}



        console.log('Data successfully processed and inserted.');

    } catch (error) {
        console.error('Error in queue processor:', error);
        throw error;  // Re-throw error to ensure job fails if there is an issue
    }
});




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




const countNAChildren = (collectedDataArray) => {
    let totalNAChildren = 0; // Total NA children count

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                let naChildren0to11 = 0;
                let naChildren11to59 = 0;

                // Calculate the number of children in each age group
                if (Array.isArray(house.families)) {
                    for (const family of house.families) {
                        naChildren0to11 += Number(family.NAChildren0to11) || 0;
                        naChildren11to59 += Number(family.NAChildren11to59) || 0;
                    }
                }

                // Only sum if either count is greater than one
                if (naChildren0to11 > 1 || naChildren11to59 > 1) {
                    totalNAChildren += naChildren0to11 + naChildren11to59;
                }
            }
        }
    }

    return totalNAChildren; // Return total NA children
};



const countNAChildrenCover = (collectedDataArray) => {
    let totalNAChildren = 0; // Total NA children count

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                let naChildren0to11 = 0;
                let naChildren11to59 = 0;

                // Calculate the number of children in each age group
                if (Array.isArray(house.families)) {
                    for (const family of house.families) {
                        naChildren0to11 += Number(family.NAChildren0to11) || 0;
                        naChildren11to59 += Number(family.NAChildren11to59) || 0;
                    }
                }

                // Check if updatedAt exists
                if (house.updatedAt) {
                    // Only sum if either count is greater than one
                    if (naChildren0to11 > 1 || naChildren11to59 > 1) {
                        totalNAChildren += naChildren0to11 + naChildren11to59;
                    }
                }
            }
        }
    }

    return totalNAChildren; // Return total NA children
};



const countNAChildrenAfter2Pm = (collectedDataArray) => {
    let totalNAChildren = 0; // Total NA children count
    const cutoffTime = new Date();
    cutoffTime.setHours(14, 0, 0, 0); // Set cutoff time to 2 PM

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                let naChildren0to11 = 0;
                let naChildren11to59 = 0;

                // Calculate the number of children in each age group
                if (Array.isArray(house.families)) {
                    for (const family of house.families) {
                        naChildren0to11 += Number(family.NAChildren0to11) || 0;
                        naChildren11to59 += Number(family.NAChildren11to59) || 0;
                    }
                }

                // Check if updatedAt exists and is after 2 PM
                if (house.updatedAt) {
                    const updatedAtDate = new Date(house.updatedAt);
                    if (updatedAtDate > cutoffTime) {
                        // Only sum if either count is greater than one
                        if (naChildren0to11 > 1 || naChildren11to59 > 1) {
                            totalNAChildren += naChildren0to11 + naChildren11to59;
                        }
                    }
                }
            }
        }
    }

    return totalNAChildren; // Return total NA children
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



const countUniqueHousesCover = (collectedDataArray) => {
    const uniqueHouses = new Set(); // To track distinct house numbers
    const previouslyLockedHouses = new Set(); // To track previously locked houses

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                const houseNumber = house.id; // Assuming house.id is the unique identifier

                // Check if the house type is 'locked'
                if (house.houseType === 'locked') {
                    previouslyLockedHouses.add(houseNumber);
                }

                // If the house is updated to a different type (e.g., 'house'), add it to uniqueHouses
                if (house.houseType === 'house' && previouslyLockedHouses.has(houseNumber)) {
                    uniqueHouses.add(houseNumber);
                    previouslyLockedHouses.delete(houseNumber); // Remove it to avoid double counting
                }
            }
        }
    }

    // Add all previously locked houses that are no longer locked
    uniqueHouses.forEach(houseNumber => previouslyLockedHouses.has(houseNumber) && uniqueHouses.add(houseNumber));

    return uniqueHouses.size; // Return the count of unique houses
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



const countUniqueLockedHousesAfter2PM = (collectedDataArray) => {
    const uniqueLockedHouses = new Set(); // To track distinct locked houses

    // Define the cutoff time for 2 PM
    const cutoffTime = new Date();
    cutoffTime.setHours(14, 0, 0, 0); // Set to 2 PM

    for (const entry of collectedDataArray) {
        for (const submission of entry.submissions) {
            const houses = submission.data.houses;

            for (const house of houses) {
                const houseNumber = house.id; // Assuming house.id is the unique identifier
                const updatedAt = new Date(house.updatedAt);

                // Check if the house is locked and updatedAt is >= 2 PM
                if (house.houseType === 'locked' && updatedAt >= cutoffTime) {
                    uniqueLockedHouses.add(houseNumber);
                }
            }
        }
    }

    return uniqueLockedHouses.size; // Return the count of unique locked houses
};


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

// Set up a cron job to clear the cache every 15 minutes
const job = new cron.CronJob('*/50 * * * *', () => {
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
        const refusalStats = getRefusalHouseStats(collectedDataArray);

        // Total calculations
        const school = getTotalVaccinatedStudents(collectedDataArray);
        const street = getTotalStreetChildrenCount(collectedDataArray);
        const guestChild = getTotalGuestChildrenCount(collectedDataArray);
        const availableChild = getTotalAvailableChildrenCount(collectedDataArray);
        const total = school + street + guestChild + availableChild;



        const totals = getTotalCounts(collectedDataArray);


        const totalChildren = countNAChildren(collectedDataArray);
        const totalChildrenWithUpdates = countNAChildrenCover(collectedDataArray);
        const totalChildrenWithUpdates2 = countNAChildrenAfter2Pm(collectedDataArray);

       const samedaynotvisit = totalChildren - totalChildrenWithUpdates;

        const remaing = totalChildren - totalChildrenWithUpdates;


        const totalUniqueHouses = countUniqueHousesCover(collectedDataArray);


        const remaingHouse = uniqueLockedHouseCount - totalUniqueHouses


        const res1 = countUniqueLockedHousesAfter2PM(collectedDataArray)


        const na=remaing-totalChildrenWithUpdates2


        // Prepare the response
        const responseData = {
            "before 8:30": beforeCutoffCount,
            "after 8:30": afterCutoffCount,
            // NA children

            "Total Na ": totalChildren,
            "Cover same day Na ": totalChildrenWithUpdates,
            "Remaining Na ": remaing,
            "Not cover after 2pm day": na,
            "NA cover after 2 pm ": totalChildrenWithUpdates2,



            "Total NA houses": uniqueLockedHouseCount,
            "NA house cover same day ": totalUniqueHouses,
            "Remaining Na House ": remaingHouse,
            "Na housevisited after 2 pm ": res1,


            "refusalStats": refusalStats,
            "school": school,
            "street": street,
            "guestChild": guestChild,
            "Children vaccinated at House": availableChild,


            "total": total,

            "Total AFP Case": totals.totalAFPCaseCount,
            "Total Zero Dose Count": totals.totalZeroDoseCount,
            "Total Newborn Count": totals.totalNewbornCount,

            // "ucmo %":result.ucmoPercentage,
            // "aic %":result.aicPercentage,



        };

        // Store the response in cache
        myCache.set(cacheKey, responseData);

        return res.status(200).json(responseData);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



const getDistinctUserIdsForCurrentDate = async () => {
    // Get the current date's start and end in UTC
    const startOfDayUTC = moment.utc().startOf('day');
    const endOfDayUTC = moment.utc().endOf('day');

 
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




// Configuration constants
const TIMEOUT_MS = 30000; // 30 seconds timeout
const BATCH_SIZE = 50; // Number of collections to process in parallel

exports.getCollectionCount = async (req, res) => {
    const { userDate } = req.query;

    try {
        // If a user-provided date exists, use it; otherwise, use the current date
        const currentDate = userDate ? moment(userDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');

        // Get the list of all collections in the database with timeout
        const collections = await Promise.race([
            mongoose.connection.db.listCollections().toArray(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Listing collections timed out')), TIMEOUT_MS)
            )
        ]);

        // Filter collections that match the pattern
        const relevantCollections = collections.filter(collection =>
            (collection.name.startsWith('house_') ||
             collection.name.startsWith('school_') ||
             collection.name.startsWith('streetChildren_')) &&
            collection.name.endsWith(currentDate)
        );

        if (relevantCollections.length === 0) {
            return res.status(404).json({ 
                message: `No collections found for the date: ${currentDate}` 
            });
        }

        // Process collections in batches to avoid overwhelming the database
        const results = [];
        for (let i = 0; i < relevantCollections.length; i += BATCH_SIZE) {
            const batch = relevantCollections.slice(i, i + BATCH_SIZE);
            
            const batchPromises = batch.map(async (collection) => {
                try {
                    const collectionName = collection.name;
                    const col = mongoose.connection.collection(collectionName);

                    // Add timeout to countDocuments operation
                    const count = await Promise.race([
                        col.countDocuments({ isProcessed: false }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`Count operation timed out for ${collectionName}`)), TIMEOUT_MS)
                        )
                    ]);

                    return { collectionName, count, status: 'success' };
                } catch (error) {
                    return {
                        collectionName: collection.name,
                        count: 0,
                        status: 'error',
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        // Separate successful and failed operations
        const successful = results.filter(result => result.status === 'success');
        const failed = results.filter(result => result.status === 'error');

        // Create the response object
        const response = {
            date: currentDate,
            counts: successful.reduce((acc, { collectionName, count }) => {
                acc[collectionName] = count;
                return acc;
            }, {}),
            totalProcessed: successful.length,
            totalFailed: failed.length
        };

        // If there were any failures, include them in the response
        if (failed.length > 0) {
            response.failures = failed.map(({ collectionName, error }) => ({
                collection: collectionName,
                error
            }));
        }

        // Determine appropriate status code based on results
        const statusCode = failed.length === results.length ? 500 : 
                          failed.length > 0 ? 207 :
                          200;

        return res.status(statusCode).json(response);

    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching collection counts',
            error: error.message
        });
    }
};

exports.bullMasterApp = bullMasterApp;
