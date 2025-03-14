import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';
import dotenv from 'dotenv';

dotenv.config();

const sharedState = {};

function runTests(groupSchema, groupSchemaExtensions = [], configuration) {
    const axios = getAxiosInstance();

    test.describe('Groups', () => {
        test('groupSchema contains attribute displayName and it is marked as required', () => {
            const displayNameAttribute = groupSchema.attributes.find(attr => attr.name === 'displayName');
            assert.ok(displayNameAttribute, 'displayName attribute should exist in groupSchema');
            assert.strictEqual(displayNameAttribute.required, true, 'displayName attribute should be marked as required');
        });

        // TODO: Retrieve all groups, ensure that for creating a new group an unique name is used...
        test('Retrieves a list of groups', async (t) => {
            const response = await axios.get('/Groups');
            assert.strictEqual(response.status, 200, 'GET /Groups should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should contain the correct schema');
            const expectedAttributes = ['totalResults', 'itemsPerPage', 'startIndex', 'schemas', 'Resources'];
            const actualAttributes = Object.keys(response.data);
            assert.deepStrictEqual(actualAttributes.sort(), expectedAttributes.sort(), 'Response attributes do not match expected attributes');
            sharedState.groups = response.data.Resources;
        });

        test('Retrieves a single group', async (t) => {
            if (!sharedState.groups || sharedState.groups.length === 0) {
                t.skip('Previous test failed or no groups found in shared state');
                return;
            }
            const firstGroup = sharedState.groups[0];
            const response = await axios.get(`/Groups/${firstGroup.id}`);
            assert.strictEqual(response.status, 200, 'GET /Groups/{id} should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Response should contain the correct schema');
            assert.strictEqual(response.data.id, firstGroup.id, 'Returned group ID should match requested group ID');
            assert.ok(response.data.displayName, 'Group should contain displayName attribute');
            assert.ok(
                response.headers['content-type'] === 'application/scim+json' ||
                response.headers['content-type'] === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing group', async () => {
            const response = await axios.get('/Groups/9876543210123456');
            assert.strictEqual(response.status, 404, 'A non-existing group should return 404');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should contain the correct error schema');

        });

        test('Creates a new group - Alternative 1', async () => {
            const newGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                displayName: `Test Group ${Math.floor(Math.random() * 10000)}`
            };

            const response = await axios.post('/Groups', newGroup);
            assert.strictEqual(response.status, 201, 'POST /Groups should return status code 201 when creating a new group');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Response should contain the correct schema');
            assert.strictEqual(response.data.displayName, newGroup.displayName, 'Created group should have the same displayName as requested');

            // Store the created group in shared state for further tests
            sharedState.createdGroup = response.data;
        });

        test('Creates a new group - Alternative 2', async () => {

            const groupName = `Test Group ${Math.floor(Math.random() * 10000)}`;
            const newGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                'urn:ietf:params:scim:schemas:core:2.0:Group': {
                    displayName: groupName
                }
            };

            const response = await axios.post('/Groups', newGroup);
            assert.strictEqual(response.status, 201, 'POST /Groups should return status code 201 when creating a new group');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Response should contain the correct schema');
            assert.strictEqual(response.data.displayName, groupName, 'Created group should have the same displayName as requested');

            // Store the created group in shared state for further tests
            sharedState.createdGroup = response.data;
        });

        test('Returns errors when creating an invalid group', async () => {
            // displayName is always required
            const newGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            };

            const response = await axios.post('/Groups', newGroup);
            assert.strictEqual(response.status, 400, 'Creating an invalid group should return status code 400');
            assert.strictEqual(response.data.scimType, "invalidSyntax", 'Error should have scimType set to invalidSyntax');
            assert.strictEqual(response.data.status, 400, 'Error response status should match HTTP status code');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should contain the correct error schema');

        });

        test('Assigns a user to a group', async () => {
            // Retrieve a user
            const userResponse = await axios.get('/Users');
            assert.strictEqual(userResponse.status, 200, 'GET /Users should return status code 200');
            assert.strictEqual(userResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'User list response should contain the correct schema');
            const user = userResponse.data.Resources[0];
            assert.ok(user, 'User should exist');

            // Retrieve a group
            const groupResponse = await axios.get('/Groups');
            assert.strictEqual(groupResponse.status, 200, 'GET /Groups should return status code 200');
            assert.strictEqual(groupResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Group list response should contain the correct schema');
            const group = groupResponse.data.Resources[0];
            assert.ok(group, 'Group should exist');

            // Assign the user to the group
            const patchResponse = await axios.patch(`/Groups/${group.id}`, {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: [{
                    op: 'add',
                    path: 'members',
                    value: [{
                        value: user.id,
                        display: user.userName
                    }]
                }]
            });
            assert.strictEqual(patchResponse.status, 200, 'PATCH /Groups/{id} should return status code 200 when assigning a user to a group');
            assert.strictEqual(patchResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Response should contain the correct schema');
            assert.ok(patchResponse.data.members.some(member => member.value === user.id), 'User should be assigned to the group');
        });
    });
}

export default runTests;