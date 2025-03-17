import test from 'node:test';
import assert from 'node:assert';
import { getConfig, getAxiosInstance } from './helpers.js';
import { get } from 'node:http';

function runTests() {
    const config = getConfig();
    
    test.describe('Basic tests', function() {
        test('Base URL should not contain any query parameters', function() {
            const baseUrl = config.baseURL;
            const url = new URL(baseUrl);
            assert.strictEqual(url.search, '', 'Base URL contains query parameters');
        });

        // ensure base url is reachable with axios, any return status code is valid
        test('Base URL should be reachable', async function(t) {
            const axios = getAxiosInstance(config, t);
            const baseUrl = config.baseURL;
            try {
                await axios.get(baseUrl);
                assert.ok(true, 'Base URL is reachable');
            } catch (error) {
                // assert an http response is received
                assert.ok(error.response, 'Expected an HTTP response from' + baseUrl);
            }
        });

        test('Authentication should be required for /Users', async function(t) {
            const axios = getAxiosInstance(config, t);
            const usersUrl = `${config.baseURL}/Users`;
            const response = await axios.get(usersUrl);
            assert.ok([401, 403].includes(response.status), 'Expected 401 Unauthorized or 403 Forbidden status'); 
        });
    });
}

export default runTests;
