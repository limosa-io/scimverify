// testSetup.js
const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.BASE_URL;
const token = process.env.TOKEN;

if (!baseURL || !token) {
    throw new Error('BASE_URL and TOKEN must be set in the environment variables');
}

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

module.exports = {
    baseURL,
    token
};
