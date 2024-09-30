// utils/logger.js

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Define custom log format
const customFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Capture stack trace
    format.splat(),
    format.printf(({ timestamp, level, message, stack }) => {
        return stack
            ? `${timestamp} [${level}]: ${message} - ${stack}`
            : `${timestamp} [${level}]: ${message}`;
    })
);

// Create logger instance
const logger = createLogger({
    level: 'info', // Default log level
    format: customFormat,
    transports: [
        // Write all logs with level error and below to error.log
        new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        // Write all logs with level info and below to combined.log
        new transports.File({ filename: path.join(logDir, 'combined.log') }),
    ],
});

// If not in production, also log to the console with the same format
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new transports.Console({
            format: customFormat,
        })
    );
}

module.exports = logger;
