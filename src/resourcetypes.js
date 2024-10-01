const test = require('node:test');
const assert = require('assert');
const config = require('./setup.js');
const axios = require('axios');

function runTests() {
    test.describe('/ResourceTypes', function () {

        // ensure base url is reachable with axios, any return status code is valid
        test('Test if is reachable', async function () {
            const baseUrl = config.baseURL;
            try {
                await axios.get(`${baseUrl}/ResourceTypes`);
                assert.ok(true, 'Base URL is reachable');
            } catch (error) {
                // assert an http response is received
                assert.ok(error.response, 'Expected an HTTP response from' + baseUrl);
            }
        });

        test('Must return list of resource types', async function () {
            const response = await axios.get(`${config.baseURL}/ResourceTypes`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const expectedAttributes = ['schemas', 'totalResults', 'Resources'];
            const actualAttributes = Object.keys(response.data);
            expectedAttributes.forEach(attr => {
                assert.ok(actualAttributes.includes(attr), `Response is missing expected attribute: ${attr}`);
            });
        });

        test('Each returned resource should be a valid resource type', async function () {
            const response = await axios.get(`${config.baseURL}/ResourceTypes`);
            const resourceTypes = response.data.Resources;
            resourceTypes.forEach(resourceType => {
                assert.ok(resourceType.schemas && resourceType.schemas[0], 'ResourceType schemas is missing or invalid');
                assert.strictEqual(resourceType.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:ResourceType');
                const expectedAttributes = ['id', 'name', 'description', 'endpoint', 'schema'];
                const actualAttributes = Object.keys(resourceType);
                expectedAttributes.forEach(attr => {
                    assert.ok(actualAttributes.includes(attr), `Resource is missing expected attribute: ${attr}`);
                });
            });
        });

        test('Retrieve single resource type', async function () {
            const response = await axios.get(`${config.baseURL}/ResourceTypes/User`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:ResourceType');
            assert.strictEqual(response.data.name, 'Users');
        });
    });
}

module.exports = runTests;
