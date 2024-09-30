// config/index.js

const googleApiConfig = require('./googleApiConfig');
const redisConfig = require('./redisConfig');
const logger = require('../utils/logger');

require('dotenv').config();

// Validate other required environment variables
const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'JWT_SECRET',
    // Add other required variables here
];

const missingVars = requiredVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

module.exports = {
    googleApiConfig,
    redisConfig,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    JWT_SECRET: process.env.JWT_SECRET,
};
