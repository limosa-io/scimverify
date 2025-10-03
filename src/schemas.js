import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';

export function runTests(configuration) {
    return test.describe('Schemas', () => {
        test('Retrieves schemas', async (t) => {
            const axios = getAxiosInstance(configuration, t);

            const response = await axios.get('/Schemas');
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');

            const resources = response.data.Resources;
            assert.ok(Array.isArray(resources), 'Schemas should be an array');

            if (configuration?.users?.enabled) {
                // Check for User schema and verify that it has attributes
                const userSchema = resources.find(s => s.id === 'urn:ietf:params:scim:schemas:core:2.0:User');
                assert.ok(userSchema, 'User schema should exist');
                assert.ok(Array.isArray(userSchema.attributes), 'User schema should have attributes');
            }

            if (configuration?.groups?.enabled) {
                // Check for Group schema and verify that it has attributes
                const groupSchema = resources.find(s => s.id === 'urn:ietf:params:scim:schemas:core:2.0:Group');
                assert.ok(groupSchema, 'Group schema should exist');
                assert.ok(Array.isArray(groupSchema.attributes), 'Group schema should have attributes');
            }
        });

    });
}
