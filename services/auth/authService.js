// services/authService.js

const axios = require('axios');
const logger = require('../utils/logger');

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Verify Facebook access token and retrieve user information.
 * @param {string} accessToken - Facebook user access token.
 * @returns {Object} - User information { id, name, email }.
 */
async function verifyFacebookToken(accessToken) {
    try {
        const response = await axios.get(`https://graph.facebook.com/me`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,email',
                appsecret_proof: generateAppSecretProof(accessToken),
            },
        });

        const { id, name, email } = response.data;
        return { id, name, email };
    } catch (error) {
        logger.error('Error verifying Facebook token:', error.response ? error.response.data : error);
        throw new Error('Invalid Facebook access token.');
    }
}

/**
 * Generate appsecret_proof for Facebook API calls
 * @param {string} accessToken 
 * @returns {string} 
 */
function generateAppSecretProof(accessToken) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', FACEBOOK_APP_SECRET);
    hmac.update(accessToken);
    return hmac.digest('hex');
}

module.exports = {
    verifyFacebookToken,
};
