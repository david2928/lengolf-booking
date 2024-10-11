// middlewares/validationMiddleware.js

const { body, validationResult } = require('express-validator');

/**
 * Middleware to validate Google login inputs.
 */
const validateLogin = [
    body('token').notEmpty().withMessage('Google ID token is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

/**
 * Middleware to validate Facebook login inputs.
 */
const validateFacebookLogin = [
    body('accessToken').notEmpty().withMessage('Facebook access token is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

/**
 * Middleware to validate Guest login inputs.
 */
const validateGuestLogin = [
    body('name').notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.'),
    body('phoneNumber').matches(/^\+?[0-9\s\-()]{7,15}$/).withMessage('Valid phone number is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

/**
 * Middleware to validate LINE login inputs.
 */
const validateLineLogin = [
    body('code').notEmpty().withMessage('Authorization code is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

module.exports = {
    validateLogin,
    validateFacebookLogin,
    validateGuestLogin,
    validateLineLogin, // Export the new middleware
};
