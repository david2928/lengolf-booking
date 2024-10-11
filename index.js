// index.js

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRouter = require('./routes/index');
const logger = require('./utils/logger');
const app = express();
const PORT = process.env.PORT || 8080; // Ensuring the app listens on the Cloud Run-assigned port

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
    console.log('Environment variables loaded from local .env file');
}

// CORS setup
app.use(cors());

// JSON parsing middleware
app.use(express.json());

// Serve static files from 'public' directory
app.use(
    express.static(path.join(__dirname, 'public'), {
        index: false, // Disable serving index.html
    })
);

// Serve index.html with environment variables replaced
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');

    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading index.html:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Replace placeholders with actual values
        const replacedData = data
            .replace('{{GOOGLE_CLIENT_ID}}', process.env.GOOGLE_CLIENT_ID)
            .replace('{{FACEBOOK_APP_ID}}', process.env.FACEBOOK_APP_ID)
            .replace('{{LINE_CLIENT_ID}}', process.env.LINE_CLIENT_ID)
            .replace('{{LINE_REDIRECT_URI}}', process.env.LINE_REDIRECT_URI);

        res.send(replacedData);
    });
});

// Use the API router for all /api routes
app.use('/api', apiRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
});

// Initialize scheduled tasks
require('./utils/scheduler');

console.log(`Configured PORT: ${PORT}`);

// Start the server
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
