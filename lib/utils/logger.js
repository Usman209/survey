const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Define the log directory
const logDir = path.join(__dirname, 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
        console.error('Error creating log directory:', error);
        process.exit(1); // Exit if unable to create log directory
    }
}

// Create the logger instance
const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                target: 'pino/file',
                options: {
                    destination: path.join(logDir, 'combined.log'),
                },
            },
            {
                target: 'pino/file',
                options: {
                    destination: path.join(logDir, 'error.log'),
                    level: 'error',
                },
            },
        ],
    },
});

// Log the paths of the log files
console.log(`Log directory: ${logDir}`);
console.log(`Combined log file: ${path.join(logDir, 'combined.log')}`);
console.log(`Error log file: ${path.join(logDir, 'error.log')}`);

// Test the logger to see if it works
logger.info('Logger initialized successfully.');

module.exports = logger;
