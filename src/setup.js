// testSetup.js
const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.BASE_URL;
const authHeader = process.env.AUTH_HEADER;
const customHeaderKey = process.env.CUSTOM_HEADER_KEY;
const customHeaderValue = process.env.CUSTOM_HEADER_VALUE;

if (!baseURL || (!authHeader && !(customHeaderKey && customHeaderValue))) {
    throw new Error('BASE_URL and an Authorization or custom header must be set in the environment variables');
}

if (authHeader) {
    axios.defaults.headers.common['Authorization'] = `${authHeader}`;
} else if (customHeaderKey && customHeaderValue) {
    axios.defaults.headers.common[customHeaderKey] = customHeaderValue;
}

module.exports = {
    baseURL,
    token
};
