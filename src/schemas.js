import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';

export function runTests(configuration) {
    const axios = getAxiosInstance();

    test.describe('Schemas', () => {
        test('Retrieves schemas', async () => {
            const response = await axios.get('/Schemas');
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');

            const resources = response.data.Resources;
            assert.ok(Array.isArray(resources), 'Schemas should be an array');

            // Check for core schema definitions
            const userSchema = resources.find(s => s.id === 'urn:ietf:params:scim:schemas:core:2.0:User');
            const groupSchema = resources.find(s => s.id === 'urn:ietf:params:scim:schemas:core:2.0:Group');

            assert.ok(userSchema, 'User schema should exist');
            assert.ok(groupSchema, 'Group schema should exist');

            // Verify attributes
            assert.ok(Array.isArray(userSchema.attributes), 'User schema should have attributes');
            assert.ok(Array.isArray(groupSchema.attributes), 'Group schema should have attributes');
        });

    });
}
