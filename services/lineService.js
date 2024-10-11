// services/lineService.js

const axios = require('axios');
const querystring = require('querystring');
const { LINE_CLIENT_ID, LINE_CLIENT_SECRET, LINE_REDIRECT_URI } = require('../config');

exports.getAccessToken = async (code) => {
    const tokenEndpoint = 'https://api.line.me/oauth2/v2.1/token';

    const params = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
    };

    const response = await axios.post(tokenEndpoint, querystring.stringify(params), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
};

exports.getUserProfile = async (accessToken) => {
    const profileEndpoint = 'https://api.line.me/v2/profile';

    const response = await axios.get(profileEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
};
