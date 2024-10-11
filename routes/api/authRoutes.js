// routes/api/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { validateLogin, validateGuestLogin, validateFacebookLogin, validateLineLogin } = require('../../middlewares/validationMiddleware');
const { JWT_SECRET } = require('../../config'); // Corrected path

const jwt = require('jsonwebtoken');

// Import the logger
const logger = require('../../utils/logger');


router.post('/verify-token', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ valid: false, message: 'No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ valid: false, message: 'Invalid token.' });
        }

        // Optionally, you can include additional checks here

        return res.json({ valid: true });
    });
});


module.exports = router;


/**
 * @route POST /api/auth/login/google
 * @desc Authenticate user with Google and provide JWT
 */
router.post('/login/google', validateLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/login/google request');
    next();
}, authController.loginWithGoogle);

/**
 * @route POST /api/auth/login/facebook
 * @desc Authenticate user with Facebook and provide JWT
 */
router.post('/login/facebook', validateFacebookLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/login/facebook request');
    next();
}, authController.loginWithFacebook);

/**
 * @route POST /api/auth/login/line
 * @desc Authenticate user with LINE and provide JWT
 */
router.post('/login/line', validateLineLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/login/line request');
    next();
}, authController.loginWithLine);

/**
 * @route POST /api/auth/login/guest
 * @desc Authenticate guest user and provide JWT
 */
router.post('/login/guest', validateGuestLogin, authController.loginAsGuest);

/**
 * @route POST /api/auth/complete-facebook-login
 * @desc Complete Facebook login by accepting additional info
 */
router.post('/complete-facebook-login', validateGuestLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/complete-facebook-login request');
    authController.completeFacebookLogin(req, res, next);
});

// Add this route to handle LINE callback
router.get('/line/callback', authController.lineCallback);

module.exports = router;
