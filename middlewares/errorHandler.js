// middlewares/errorHandler.js

const logger = require('../utils/logger');

/**
 * Global error handling middleware.
 */
module.exports = (err, req, res, next) => {
    logger.error('Unhandled Error:', err);

    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
    });
};
