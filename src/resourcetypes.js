import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';

function runTests(configuration) {
    return test.describe('ResourceTypes', () => {
        test('Retrieves resource types', async (t) => {
            const axios = getAxiosInstance(configuration, t);
            const response = await axios.get('/ResourceTypes');
            assert.strictEqual(response.status, 200, 'ResourceTypes endpoint should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should have the correct ListResponse schema');

            const resources = response.data.Resources;
            assert.ok(Array.isArray(resources), 'Resources should be an array');

            if (configuration?.users?.enabled) {
                // Check for User resource type and verify essential properties
                const userResourceType = resources.find(r => r.id === 'User');
                assert.ok(userResourceType, 'User resource type should exist');
                assert.ok(userResourceType.schema, 'User resource type should have a schema');
            }

            if (configuration?.groups?.enabled) {
                // Check for Group resource type and verify essential properties
                const groupResourceType = resources.find(r => r.id === 'Group');
                assert.ok(groupResourceType, 'Group resource type should exist');
                assert.ok(groupResourceType.schema, 'Group resource type should have a schema');
            }
        });
    });
}

export default runTests;
