// db.config.js
const mongoose = require('mongoose');
require('dotenv').config();

let isDbConnected = false;

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            maxPoolSize: 500,
            minPoolSize: 25,
        });

        isDbConnected = true;

        // Handle connection events
        mongoose.connection.on('connected', () => {
            isDbConnected = true;
            console.log('MongoDB connected');
        });

        mongoose.connection.on('disconnected', () => {
            isDbConnected = false;
            console.log('MongoDB disconnected');
            // Attempt to reconnect
            setTimeout(() => retryConnect(5), 5000);
        });

        mongoose.connection.on('error', (err) => {
            isDbConnected = false;
            console.error('MongoDB connection error:', err);
        });

    } catch (error) {
        isDbConnected = false;
        console.error('Error in DB connection:', error.stack);
        throw new Error("Database connection failed");
    }
};

// Retry logic with exponential backoff
const retryConnect = async (retries = 5, delay = 3000) => {
    try {
        await dbConnection();
        console.log("Database connected successfully");
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying DB connection... Attempts left: ${retries}`);
            await new Promise(res => setTimeout(res, delay));
            await retryConnect(retries - 1, delay * 2);
        } else {
            console.error("Database connection failed after multiple retries:", error);
            throw new Error("Database connection failed");
        }
    }
};

// Middleware to check connection status
const checkDBConnection = (req, res, next) => {
    if (!isDbConnected) {
        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable. Please try again later.',
            retryAfter: 5 // seconds
        });
    }
    next();
};

// Get current connection status
const getConnectionStatus = () => {
    return {
        isConnected: isDbConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        poolSize: mongoose.connection.config?.maxPoolSize || 0
    };
};

// Initialize database with retry mechanism
const initializeDatabase = async () => {
    try {
        await retryConnect();
    } catch (error) {
        console.error('Failed to initialize database after all retries');
        process.exit(1); // Optional: exit if initial connection fails
    }
};

module.exports = {
    dbConnection,
    retryConnect,
    checkDBConnection,
    getConnectionStatus,
    initializeDatabase,
    isDbConnected
};
