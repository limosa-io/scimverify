import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import test from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

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

/**
 * 
 * @param {*} config 
 * @param TestContext testContext 
 * @returns 
 */
export function getAxiosInstance(config = defaultConfig, testContext = null) {
    const instance = axios.create({
        baseURL: config.baseURL,
        headers: {
            'Authorization': `Bearer ${config.token}`,
            'User-Agent': 'veriyf.scim.dev'
        },
        validateStatus: function (status) {
            // Return true for any status code (don't throw errors)
            return true;
        }
    });

    const t = testContext;

    // Add request interceptor to log the raw HTTP request
    instance.interceptors.request.use(request => {
        const requestLog = {
            test_name: t?.name,
            type: 'request',
            method: request.method?.toUpperCase(),
            url: `${request.baseURL}${request.url}`,
            headers: request.headers,
            body: request.data || null
        };

        t?.diagnostic(requestLog);

        return request;
    });

    // Add response interceptor to log the raw HTTP response
    instance.interceptors.response.use(response => {
        const responseLog = {
            test_name: t?.name,
            type: 'response',
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.data
        };

        t?.diagnostic(responseLog)
        return response;
    }, error => {
        if (error.response) {
            const errorLog = {
                test_name: t?.name,
                type: 'error',
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                body: error.response.data
            };

            t?.diagnostic(errorLog)
        }
        return Promise.reject(error);
    });
    return instance;
}

export function getConfig() {
    return defaultConfig;
}

/**
 * Creates a test wrapper that provides an axios instance with test context
 * @param {string} name - The test name
 * @param {function} testFn - The test function to execute
 * @returns {function} - The wrapped test function
 */
export function testWithAxios(name, testFn) {
    // Get the caller's information to preserve the original file location in test reports

    return test(name, async function (t) {
        // Create a new axios instance for this specific test
        const testAxios = getAxiosInstance(getConfig(), t);

        // Call original test function with axios instance and test context
        return testFn.apply(this, [testAxios, t]);
    });
}
