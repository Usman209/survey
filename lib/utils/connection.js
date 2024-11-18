const mongoose = require('mongoose');

const dbConnection = async () => {
    try {
        // Enable Mongoose debug mode (useful for debugging slow queries or operations)
        // mongoose.set('debug', true); // Uncomment during debugging
        
        // Connect to MongoDB
        await mongoose.connect(process.env.DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,  // Time to wait for MongoDB to respond
            connectTimeoutMS: 30000,          // Time to establish a connection
            maxPoolSize: 500,                 // Max number of connections in the pool
            minPoolSize: 25,                  // Min number of connections in the pool
        });

    } catch (error) {
        console.error(error.stack); // Log the full stack for debugging
        throw new Error("Database connection failed"); // You can handle or re-throw as needed
    }
};

module.exports = { dbConnection };
