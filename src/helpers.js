const axios = require('axios');
require('dotenv').config();

let config = {
    baseURL: process.env.BASE_URL,
    token: process.env.TOKEN
};

if (process.env.CONFIG) {
    config.CONFIG = JSON.parse(process.env.CONFIG);
}

// Validate configuration
if (!config.url && !config.baseURL) {
    throw new Error('URL or BASE_URL must be set in configuration');
}
if (!config.token) {
    throw new Error('TOKEN must be set in configuration');
}

function getAxiosInstance() {
    const baseURL = config.url || config.baseURL;
    
    const instance = axios.create({
        baseURL: baseURL,
        headers: {
            'Authorization': `Bearer ${config.token}`
        }
    });
    return instance;
}

function getConfig() {
    return config.CONFIG;
}

module.exports = {
    getAxiosInstance,
    getConfig
};
