// controllers/authController.js

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const customerService = require('../services/customerService');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { GOOGLE_CLIENT_ID, JWT_SECRET, googleApiConfig } = require('../config');

// Initialize Google OAuth2 Client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Extract Facebook credentials
const FACEBOOK_APP_ID = googleApiConfig.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = googleApiConfig.FACEBOOK_APP_SECRET;

/**
 * Handle user login by verifying Google ID token.
 */
exports.loginWithGoogle = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];

        // Fetch customer data from Google Sheets
        const customerData = await customerService.getCustomerData(userId);
        const phoneNumber = customerData ? customerData.phoneNumber : '';
        const loginSource = 'Google';

        // Save or update customer data
        await customerService.saveOrUpdateCustomerData({
            userId,
            name,
            email,
            phoneNumber,
            loginSource,
        });

        // Generate JWT
        const jwtToken = jwt.sign({ userId, email, name, loginSource }, JWT_SECRET, {
            expiresIn: '1h',
        });

        return res.status(200).json({
            success: true,
            token: jwtToken,
            userId,
            email,
            name,
            phoneNumber,
            loginSource,
        });
    } catch (error) {
        logger.error('Error verifying Google token:', error);
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

/**
 * Handle user login by verifying Facebook access token.
 */
exports.loginWithFacebook = async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ success: false, message: 'Access token is required.' });
    }

    try {
        // Verify the access token with Facebook
        const debugTokenResponse = await axios.get(`https://graph.facebook.com/debug_token`, {
            params: {
                input_token: accessToken,
                access_token: `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
            },
        });

        const data = debugTokenResponse.data.data;

        if (!data.is_valid) {
            return res.status(401).json({ success: false, message: 'Invalid Facebook access token.' });
        }

        const userId = data.user_id;

        // Fetch user data from Facebook
        const userDataResponse = await axios.get(`https://graph.facebook.com/${userId}`, {
            params: {
                fields: 'id,name,email',
                access_token: accessToken,
            },
        });

        const userData = userDataResponse.data;
        const email = userData.email || '';
        const name = userData.name || '';

        // Fetch customer data from Google Sheets
        const customerData = await customerService.getCustomerData(userId);
        const phoneNumber = customerData ? customerData.phoneNumber : '';
        const loginSource = 'Facebook';

        // Save or update customer data
        await customerService.saveOrUpdateCustomerData({ userId, name, email, phoneNumber, loginSource });

        // Generate JWT
        const jwtToken = jwt.sign(
            { userId, email, name, loginSource },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({ 
            success: true, 
            token: jwtToken,
            userId, 
            email, 
            name, 
            phoneNumber,
            loginSource
        });
    } catch (error) {
        logger.error('Error verifying Facebook access token:', error);
        return res.status(401).json({ success: false, message: 'Invalid Facebook access token.' });
    }
};

/**
 * Handle guest login by accepting user details directly.
 */
exports.loginAsGuest = async (req, res) => {
    const { name, email, phoneNumber } = req.body;

    // Basic validation
    if (!name || !email || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Name, email, and phone number are required for guest login.' });
    }

    try {
        // Generate a unique userId for the guest (could use UUID)
        const userId = `guest_${Date.now()}`;

        const loginSource = 'Guest';

        // Save or update customer data
        await customerService.saveOrUpdateCustomerData({ userId, name, email, phoneNumber, loginSource });

        // Generate JWT
        const jwtToken = jwt.sign(
            { userId, email, name, loginSource },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        return res.status(200).json({ 
            success: true, 
            token: jwtToken, // Return the JWT to the client
            userId, 
            email, 
            name, 
            phoneNumber,
            loginSource
        });
    } catch (error) {
        logger.error('Error during guest login:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

/**
 * Handle additional information for Facebook users missing name or email.
 */
exports.addAdditionalInfoForFacebookUser = async (req, res) => {
    const { userId, name, email, phoneNumber } = req.body;

    // Basic validation
    if (!userId || !name || !email || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'User ID, name, email, and phone number are required.' });
    }

    try {
        const loginSource = 'Facebook';

        // Save or update customer data
        await customerService.saveOrUpdateCustomerData({ userId, name, email, phoneNumber, loginSource });

        // Generate JWT
        const jwtToken = jwt.sign(
            { userId, email, name, loginSource },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        return res.status(200).json({ 
            success: true, 
            token: jwtToken, // Return the JWT to the client
            userId, 
            email, 
            name, 
            phoneNumber,
            loginSource
        });
    } catch (error) {
        logger.error('Error adding additional info for Facebook user:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

exports.completeFacebookLogin = async (req, res) => {
    const { userId, name, email, phoneNumber } = req.body;

    // Basic validation
    if (!userId || !name || !email || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'User ID, name, email, and phone number are required.' });
    }

    try {
        const loginSource = 'Facebook';

        // Save or update customer data
        await customerService.saveOrUpdateCustomerData({ userId, name, email, phoneNumber, loginSource });

        // Generate JWT
        const jwtToken = jwt.sign(
            { userId, email, name, loginSource },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({ 
            success: true, 
            token: jwtToken,
            userId, 
            email, 
            name, 
            phoneNumber,
            loginSource
        });
    } catch (error) {
        logger.error('Error completing Facebook login:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};
