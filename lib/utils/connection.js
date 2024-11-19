const mongoose = require('mongoose');

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,  // Wait time for MongoDB to respond
            connectTimeoutMS: 30000,          // Time to establish a connection
            maxPoolSize: 500,                 // Max number of connections in the pool
            minPoolSize: 25,                  // Min number of connections in the pool
        });

        console.log("MongoDB connected successfully!");

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
        });
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

    } catch (error) {
        console.error('Error in DB connection:', error.stack);
        throw new Error("Database connection failed");
    }
};

// Retry logic for connecting to MongoDB
const retryConnect = async (retries = 5, delay = 3000) => {
    try {
        await dbConnection();
        console.log("Database connected successfully");
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying DB connection... Attempts left: ${retries}`);
            await new Promise(res => setTimeout(res, delay));  // Delay between retries
            await retryConnect(retries - 1, delay * 2); // Exponential backoff
        } else {
            console.error("Database connection failed after multiple retries:", error);
            throw new Error("Database connection failed");
        }
    }
};

retryConnect();  // Call retry function to attempt connection

module.exports = { dbConnection };
