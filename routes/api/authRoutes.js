// routes/api/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { validateLogin, validateGuestLogin, validateFacebookLogin } = require('../../middlewares/validationMiddleware');

// Import the logger
const logger = require('../../utils/logger');

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
 * @route POST /api/auth/login/guest
 * @desc Authenticate guest user and provide JWT
 */
router.post('/login/guest', validateGuestLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/login/guest request');
    next();
}, authController.loginAsGuest);

/**
 * @route POST /api/auth/complete-facebook-login
 * @desc Complete Facebook login by accepting additional info
 */
router.post('/complete-facebook-login', validateGuestLogin, (req, res, next) => {
    logger.info('Received POST /api/auth/complete-facebook-login request');
    authController.completeFacebookLogin(req, res, next);
});

module.exports = router;
