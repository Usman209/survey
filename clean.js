const { MongoClient } = require('mongodb');

// Replace with your MongoDB connection URI
const uri = 'mongodb://110.38.226.9:28018';
const client = new MongoClient(uri);



async function cleanUpCollections() {
    try {
      await client.connect();
      const db = client.db('polio'); // Replace 'yourDatabase' with your actual database name
  
      // Fetch all collections from the database
      const collections = await db.listCollections().toArray();
  
   
  
      // Get collections that match the pattern (adjusted for flexibility)
      const matchingCollections = collections.filter(col => {
        const matchesLock00 = /^checkList(Lock|00)_/.test(col.name);
        const matchesOther = /^(checkListForm84|checkListNA|house|school|streetChildren)/.test(col.name);
        return matchesLock00 || matchesOther;
      });
  
      // Log the collections that match
      console.log('Matching collections:', matchingCollections.map(col => col.name).join(', '));
  
      // Process each matching collection
      for (const collectionInfo of matchingCollections) {
        const collectionName = collectionInfo.name;
        console.log(`Processing collection: ${collectionName}`);  // Debug: Log which collection is being processed
  
        const collection = db.collection(collectionName);
  
        // Remove documents with isProcessed: true
        const deleteResult = await collection.deleteMany({ isProcessed: true });
        console.log(`Deleted ${deleteResult.deletedCount} records from ${collectionName}`);
  
        // Check if collection is empty
        const count = await collection.countDocuments();
        console.log(`Collection ${collectionName} now has ${count} documents`);  // Debug: Log the count of documents after deletion
        if (count === 0) {
          // If the collection is empty, drop it
          await db.dropCollection(collectionName);
          console.log(`Dropped empty collection: ${collectionName}`);
        }
      }
  
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      await client.close();
    }
  }
  
  // Run the cleanup function
  cleanUpCollections();