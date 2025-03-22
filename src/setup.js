// testSetup.js
const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.BASE_URL;
const authHeader = process.env.AUTH_HEADER;

if (!baseURL || !authHeader) {
    throw new Error('BASE_URL and AUTH_HEADER must be set in the environment variables');
}

axios.defaults.headers.common['Authorization'] = `${authHeader}`;

module.exports = {
    baseURL,
    token
};
