const test = require('node:test');
const assert = require('assert');
const config = require('./setup.js');
const axios = require('axios');

function runTests() {
    test.describe('/Schemas', function () {
        // ensure base url is reachable with axios, any return status code is valid
        test('/Schemas endpoint should be reachable', async function () {
            const baseUrl = config.baseURL;
            try {
                await axios.get(`${baseUrl}/Schemas`);
                assert.ok(true, 'Base URL is reachable');
            } catch (error) {
                // assert an http response is received
                assert.ok(error.response, 'Expected an HTTP response from' + baseUrl);
            }
        });

        test('Should return a list of schemas', async function () {
            const response = await axios.get(`${config.baseURL}/Schemas`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const expectedAttributes = ['schemas', 'totalResults', 'Resources'];
            const actualAttributes = Object.keys(response.data);
            expectedAttributes.forEach(attr => {
                assert.ok(actualAttributes.includes(attr), `Response is missing expected attribute: ${attr}`);
            });
        });

        test('Every schema in the list should be valid', async function () {
            const response = await axios.get(`${config.baseURL}/Schemas`);
            const resourceTypes = response.data.Resources;
            resourceTypes.forEach(resourceType => {
                assert.ok(resourceType.schemas && resourceType.schemas[0], 'Schemas is missing or invalid');
                assert.strictEqual(resourceType.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Schema');
                const expectedAttributes = ['id', 'name'];
                const actualAttributes = Object.keys(resourceType);
                expectedAttributes.forEach(attr => {
                    assert.ok(actualAttributes.includes(attr), `Schema is missing expected attribute: ${attr}`);
                });
            });
        });

        test('Should be able to retrieve a single schema', async function () {
            const response = await axios.get(`${config.baseURL}/Schemas/urn:ietf:params:scim:schemas:core:2.0:User`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Schema');
            assert.strictEqual(response.data.name, 'User');
        });
    });
}


module.exports = {
    runTests
};
