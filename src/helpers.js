import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let configFromEnv = {};
try {
    if (process.env.CONFIG) {
        configFromEnv = JSON.parse(process.env.CONFIG);
    }
} catch (e) {
    console.warn('Invalid JSON in CONFIG environment variable');
}

let defaultConfig = {
    baseURL: process.env.BASE_URL,
    token: process.env.TOKEN,
    ...configFromEnv
};

if (!defaultConfig.baseURL || !defaultConfig.token) {
    throw new Error('BASE_URL and TOKEN must be set in the environment variables');
}

export function getAxiosInstance(config = defaultConfig) {
    const instance = axios.create({
        baseURL: config.baseURL,
        headers: {
            'Authorization': `Bearer ${config.token}`
        },
        validateStatus: function (status) {
            // Return true for any status code (don't throw errors)
            return true; 
        }
    });

    // Add request interceptor to log the raw HTTP request
    instance.interceptors.request.use(request => {
        console.log('HTTP Request:');
        console.log(`${request.method.toUpperCase()} ${request.baseURL}${request.url}`);
        console.log('Headers:', JSON.stringify(request.headers, null, 2));
        if (request.data) {
            console.log('Body:', JSON.stringify(request.data, null, 2));
        }
        return request;
    });

    // Add response interceptor to log the raw HTTP response
    instance.interceptors.response.use(response => {
        console.log('HTTP Response:');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Body:', JSON.stringify(response.data, null, 2));
        return response;
    }, error => {
        if (error.response) {
            console.log('HTTP Error Response:');
            console.log(`Status: ${error.response.status} ${error.response.statusText}`);
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('Body:', JSON.stringify(error.response.data, null, 2));
        }
        return Promise.reject(error);
    });
    return instance;
}

export function getConfig() {
    return defaultConfig;
}
