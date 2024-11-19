const mongoose = require('mongoose');

// Flag to track DB connection state
let isDbConnected = false;

// Function to initialize the DB connection
const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            socketTimeoutMS: 60000,   // 60 seconds timeout for socket operations
            serverSelectionTimeoutMS: 30000,  // Wait time for MongoDB to respond
            connectTimeoutMS: 60000,          // Time to establish a connection
            maxPoolSize: 500,                 // Max number of connections in the pool
            minPoolSize: 25,                  // Min number of connections in the pool
        });

        console.log("MongoDB connected successfully!");

        // Set connection state to true when connected
        isDbConnected = true;

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
            isDbConnected = true;  // Ensure the state is updated
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            isDbConnected = false; // Update state on disconnection
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            isDbConnected = false; // Update state on error
        });

    } catch (error) {
        console.error('Error in DB connection:', error.stack);
        isDbConnected = false; // Mark as disconnected on failure
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

// Call retry function to attempt connection
retryConnect();

// Middleware to check DB connection before processing requests
const checkDBConnection = (req, res, next) => {
    if (!isDbConnected) {
        return res.status(503).json({ message: 'Service temporarily unavailable. Please try again later.' });
    }
    next();
};

// Export the functions so they can be used elsewhere
module.exports = { dbConnection, checkDBConnection };
