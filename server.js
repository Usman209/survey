// app.js or server.js
const express = require("express");
const session = require("express-session");
const passport = require('passport');
const RedisStore = require('connect-redis').default;
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require('body-parser');
const { useApitally } = require("apitally/express");
const Queue = require('bull');
const redisClient = require('./config/redis.js');
require("dotenv").config();

const logger = require('./lib/utils/logger.js');
const { bullMasterApp } = require('./api/survey/controller');
const { HOST, PORT, SESS_SECRET } = require("./config/config");
const { 
    dbConnection, 
    checkDBConnection, 
    initializeDatabase,
    getConnectionStatus 
} = require("./lib/utils/connection.js");

const app = express();

// Body parser setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ 
    limit: '50mb', 
    extended: true, 
    parameterLimit: 50000 
}));
app.use(bodyParser.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.use('/uploads', express.static('uploads'));

// Bull Master admin interface
app.use('/admin/queues', bullMasterApp);

// Apitally setup
useApitally(app, {
    clientId: "579ffc9c-b5f6-4464-b0d9-e896ab97a4d0",
    env: "dev",
});

// Redis session store setup
const sessionStore = new RedisStore({ client: redisClient });
const MAX_AGE = 1000 * 60 * 60 * 3; // Three hours

app.use(session({
    store: sessionStore,
    secret: SESS_SECRET,
    saveUninitialized: true,
    cookie: { 
        maxAge: MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    resave: false
}));

// Security middleware
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ 
    origin: "*", 
    credentials: true, 
    optionsSuccessStatus: 200 
}));

// Database connection check for API routes

// Health check endpoint
app.get("/health", (req, res) => {
    const dbStatus = getConnectionStatus();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisClient.status
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.send("API Running");
});

// Import routes
require("./routes")(app);

// 404 handler
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error({
        message: err.message,
        status: err.status || 500,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        params: req.params
    }, 'An error occurred');

    const response = {
        status: 'error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    };

    res.status(err.status || 500).json(response);
});

// Graceful shutdown function
const gracefulShutdown = async (server) => {
    logger.info('Received shutdown signal');

    try {
        // Close server
        await new Promise(resolve => server.close(resolve));
        logger.info('Server closed');

        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            logger.info('Database connection closed');
        }

        // Close Redis connection
        if (redisClient) {
            await redisClient.quit();
            logger.info('Redis connection closed');
        }

        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Start server function
const startServer = async () => {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized successfully');

        // Create and start server
        const server = require("http").createServer(app);
        
        // Setup graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown(server));
        process.on('SIGINT', () => gracefulShutdown(server));

        // Start listening
        server.listen(PORT, () => {
            logger.info(`Server is listening on port ${PORT}`);
        });

        return server;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer().catch(error => {
    logger.error('Failed to start application:', error);
    process.exit(1);
});

module.exports = app;