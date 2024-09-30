// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const util = require('util');
const { JWT_SECRET } = require('../config');

// Promisify jwt.verify to use async/await
const verifyJwt = util.promisify(jwt.verify);

/**
 * Middleware to authenticate requests using JWT.
 * Assumes that the JWT is sent in the Authorization header as a Bearer token.
 */

/**
 * Extracts the JWT token from the Authorization header.
 * @param {Object} req - Express request object
 * @returns {string|null} - The extracted token or null if not found
 */
function extractToken(req) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return null;
    }

    const scheme = parts[0];
    const token = parts[1];

    if (/^Bearer$/i.test(scheme)) {
        return token;
    }

    return null;
}

/**
 * Express middleware to authenticate JWT tokens.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticateJWT(req, res, next) {
    try {
        const token = extractToken(req);

        if (!token) {
            logger.warn(
                `Authentication failed: No token provided. Path: ${req.originalUrl}, Method: ${req.method}`
            );
            return res
                .status(401)
                .json({ success: false, message: 'Authentication token is missing or invalid.' });
        }

        // Verify the token
        const decoded = await verifyJwt(token, JWT_SECRET);

        // Attach decoded token to request for use in subsequent middlewares/routes
        req.user = decoded;
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            logger.warn(
                `Authentication failed: Token expired. Path: ${req.originalUrl}, Method: ${req.method}`
            );
            return res
                .status(401)
                .json({ success: false, message: 'Authentication token has expired.' });
        } else if (error.name === 'JsonWebTokenError') {
            logger.warn(
                `Authentication failed: Invalid token. Path: ${req.originalUrl}, Method: ${req.method}, Error: ${error.message}`
            );
            return res
                .status(401)
                .json({ success: false, message: 'Authentication token is invalid.' });
        } else {
            // For other errors, respond with a generic message
            logger.error(
                `Authentication error: ${error.message}. Path: ${req.originalUrl}, Method: ${req.method}`,
                error
            );
            return res
                .status(500)
                .json({ success: false, message: 'An internal server error occurred during authentication.' });
        }
    }
}

module.exports = authenticateJWT;
