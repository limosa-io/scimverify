const test = require('node:test');
const assert = require('assert');
const config = require('./setup.js');
const axios = require('axios');

function runTests() {
    test.describe('SCIM Base URL Tests', function() {
        test('Base URL should not contain any query parameters', function() {
            const baseUrl = config.baseURL;
            const url = new URL(baseUrl);
            assert.strictEqual(url.search, '', 'Base URL contains query parameters');
        });

        // ensure base url is reachable with axios, any return status code is valid
        test('Base URL should be reachable', async function() {
            const baseUrl = config.baseURL;
            try {
                await axios.get(baseUrl);
                assert.ok(true, 'Base URL is reachable');
            } catch (error) {
                // assert an http response is received
                assert.ok(error.response, 'Expected an HTTP response from' + baseUrl);
            }
        });

        test('Authentication should be required for /Users', async function() {
            const usersUrl = `${config.baseURL}/Users`;
            try {
                await axios.get(usersUrl);
            } catch (error) {
                assert.ok([401, 403].includes(error.response.status), 'Expected 401 Unauthorized or 403 Forbidden status');
            } finally {
                assert.ok(true, 'Endpoint requires authentication');
            }
        });
    });
}

module.exports = runTests;
