// config/index.js
const googleApiConfig = require('./googleApiConfig');
const cacheConfig = require('./cacheConfig');
const logger = require('../utils/logger');

require('dotenv').config();

// Validate required environment variables
const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'JWT_SECRET',
    'LINE_CLIENT_ID',
    'LINE_CLIENT_SECRET',
    'LINE_REDIRECT_URI',
    'FRONTEND_URL'
    // Add other required variables here
];

const missingVars = requiredVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

module.exports = {
    googleApiConfig,
    cacheConfig,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    JWT_SECRET: process.env.JWT_SECRET,
    LINE_CLIENT_ID: process.env.LINE_CLIENT_ID,
    LINE_CLIENT_SECRET: process.env.LINE_CLIENT_SECRET,
    LINE_REDIRECT_URI: process.env.LINE_REDIRECT_URI,
    FRONTEND_URL: process.env.FRONTEND_URL
};