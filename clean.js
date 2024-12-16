// cleanup.js

const { MongoClient } = require('mongodb');
const cron = require('node-cron');

// MongoDB URI
const uri = 'mongodb://110.38.226.9:28018';
const client = new MongoClient(uri);

// Cleanup function
async function cleanUpCollections() {
    try {
        await client.connect();
        const db = client.db('polio'); // Replace with your database name

        // Fetch all collections from the database
        const collections = await db.listCollections().toArray();

        // Get collections that match the pattern
        const matchingCollections = collections.filter(col => {
            const matchesLock00 = /^checkList(Lock|00)_/.test(col.name);
            const matchesOther = /^(checkListForm84|checkListNA|house|school|streetChildren)/.test(col.name);
            return matchesLock00 || matchesOther;
        });

        // Log matching collections

        // Process each matching collection
        for (const collectionInfo of matchingCollections) {
            const collectionName = collectionInfo.name;

            const collection = db.collection(collectionName);

            // Remove documents with isProcessed: true
            const deleteResult = await collection.deleteMany({ isProcessed: true });

            // Check if collection is empty
            const count = await collection.countDocuments();
            if (count === 0) {
                // Drop the empty collection
                await db.dropCollection(collectionName);
              
            }
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await client.close();
    }
}

// // Schedule the cleanup function to run daily at 8 PM
// cron.schedule('0 20 * * *', () => {
//     console.log('Running cleanup task daily at 8 PM...');
//     cleanUpCollections();
// });

// console.log('Cron job for cleanup is scheduled to run daily at 8 PM');