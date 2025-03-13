import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';

function runTests(configuration) {
    const axios = getAxiosInstance();

    test.describe('/ResourceTypes', () => {
        test('Retrieves resource types', async () => {
            const response = await axios.get('/ResourceTypes');
            assert.strictEqual(response.status, 200, 'ResourceTypes endpoint should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should have the correct ListResponse schema');
            
            const resources = response.data.Resources;
            assert.ok(Array.isArray(resources), 'Resources should be an array');
            
            // Check for User and Group resource types
            const userResourceType = resources.find(r => r.id === 'User');
            const groupResourceType = resources.find(r => r.id === 'Group');
            
            assert.ok(userResourceType, 'User resource type should exist');
            assert.ok(groupResourceType, 'Group resource type should exist');
            
            // Verify essential properties
            assert.ok(userResourceType.schema, 'User resource type should have a schema');
            assert.ok(groupResourceType.schema, 'Group resource type should have a schema');
        });
    });
}

export default runTests;
