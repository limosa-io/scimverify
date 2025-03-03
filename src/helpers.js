const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

let defaultConfig = {
    baseURL: process.env.BASE_URL,
    token: process.env.TOKEN
};

if (!defaultConfig.baseURL || !defaultConfig.token) {
    throw new Error('BASE_URL and TOKEN must be set in the environment variables');
}

function getAxiosInstance(config = defaultConfig) {
    const instance = axios.create({
        baseURL: config.baseURL,
        headers: {
            'Authorization': `Bearer ${config.token}`
        }
    });
    return instance;
}

module.exports = {
    getAxiosInstance
};
