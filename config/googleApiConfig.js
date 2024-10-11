// config/googleApiConfig.js

const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();
const logger = require('../utils/logger');

// Validate Required Environment Variables for Google APIs and LINE
const requiredVars = [
    'SERVICE_ACCOUNT_KEY_BASE64',
    'SPREADSHEET_ID',
    'LINE_NOTIFY_TOKEN',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'LINE_CLIENT_ID',       // Added LINE Client ID
    'LINE_CLIENT_SECRET',   // Added LINE Client Secret
    'LINE_REDIRECT_URI',    // Added LINE Redirect URI
];

const missingVars = requiredVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Parse the base64-encoded service account key
let credentials;
try {
    credentials = JSON.parse(
        Buffer.from(process.env.SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8')
    );
    logger.info('Service Account Credentials Loaded Successfully.');
    logger.info(`Service Account Email: ${credentials.client_email}`);
} catch (error) {
    logger.error('Failed to parse SERVICE_ACCOUNT_KEY_BASE64:', error);
    process.exit(1); // Exit if credentials are invalid
}

// Instantiate GoogleAuth with the parsed credentials and required scopes
const googleAuth = new GoogleAuth({
    credentials: credentials,
    scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

module.exports = {
    CALENDARS: {
        'Bay 1 (Bar)':
            'a6234ae4e57933edb48a264fff4c5d3d3653f7bedce12cfd9a707c6c0ff092e4@group.calendar.google.com',
        'Bay 2':
            '3a700346dd902abd4aa448ee63e184a62f05d38bb39cb19a8fc27116c6df3233@group.calendar.google.com',
        'Bay 3 (Entrance)':
            '092757d971c313c2986b43f4c8552382a7e273b183722a44a1c4e1a396568ca3@group.calendar.google.com',
    },

    googleAuth: googleAuth, // Export the GoogleAuth instance

    SPREADSHEET_ID: process.env.SPREADSHEET_ID,

    LINE_NOTIFY_TOKEN: process.env.LINE_NOTIFY_TOKEN,

    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID, // Export Facebook App ID
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET, // Export Facebook App Secret

    // Export LINE OAuth credentials
    LINE_CLIENT_ID: process.env.LINE_CLIENT_ID,
    LINE_CLIENT_SECRET: process.env.LINE_CLIENT_SECRET,
    LINE_REDIRECT_URI: process.env.LINE_REDIRECT_URI,
};
