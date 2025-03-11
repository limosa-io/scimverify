import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let defaultConfig = {
    baseURL: process.env.BASE_URL,
    token: process.env.TOKEN,
    config: JSON.parse(process.env.CONFIG)
};

if (!defaultConfig.baseURL || !defaultConfig.token) {
    throw new Error('BASE_URL and TOKEN must be set in the environment variables');
}

export function getAxiosInstance(config = defaultConfig) {
    const instance = axios.create({
        baseURL: config.baseURL,
        headers: {
            'Authorization': `Bearer ${config.token}`
        }
    });
    return instance;
}

export function getConfig() {
    return defaultConfig;
}
