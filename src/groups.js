const test = require('node:test');
var assert = require('node:assert');
const axios = require('axios');

require('dotenv').config();

const sharedState = {};

const baseURL = process.env.BASE_URL;
const token = process.env.TOKEN;

if (!baseURL || !token) {
    throw new Error('BASE_URL and TOKEN must be set in the environment variables');
}

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

function runTests() {
    test.describe('/Groups', () => {
        // TODO: Retrieve all groups, ensure that for creating a new group an unique name is used...
        test('Retrieves a list of groups', async (t) => {
            const response = await axios.get(`${baseURL}/Groups`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const expectedAttributes = ['totalResults', 'itemsPerPage', 'startIndex', 'schemas', 'Resources'];
            const actualAttributes = Object.keys(response.data);
            assert.deepStrictEqual(actualAttributes.sort(), expectedAttributes.sort(), 'Response attributes do not match expected attributes');
            sharedState.groups = response.data.Resources;
        });

        test('Retrieves a single group', async () => {
            if (!sharedState.groups || sharedState.groups.length === 0) {
                test.skip('Previous test failed or no groups found in shared state');
                return;
            }
            const firstGroup = sharedState.groups[0];
            const response = await axios.get(`${baseURL}/Groups/${firstGroup.id}`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group');
            assert.strictEqual(response.data.id, firstGroup.id);
            assert.ok(
                response.headers['content-type'] === 'application/scim+json' ||
                response.headers['content-type'] === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing group', async () => {
            try {
                await axios.get(`${baseURL}/Groups/9876543210123456`);
                assert.fail('Expected error not thrown');
            } catch (error) {
                assert.strictEqual(error.response.status, 404);
                assert.strictEqual(error.response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error');
            }
        });

        test('Creates a new group - Alternative 1', async () => {
            const newGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                displayName: `Test Group ${Math.floor(Math.random() * 10000)}`
            };

            const response = await axios.post(`${baseURL}/Groups`, newGroup);
            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group');
            assert.strictEqual(response.data.displayName, newGroup.displayName);

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

            const response = await axios.post(`${baseURL}/Groups`, newGroup);
            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group');
            assert.strictEqual(response.data.displayName, groupName);

            // Store the created group in shared state for further tests
            sharedState.createdGroup = response.data;
        });

        test('Returns errors when creating an invalid group', async () => {
            const newGroup = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            };

            try {
                await axios.post(`${baseURL}/Groups`, newGroup);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.strictEqual(error.response.status, 400);
                assert.strictEqual(error.response.data.scimType, "invalidSyntax");
                assert.strictEqual(error.response.data.status, 400);
                assert.strictEqual(error.response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error');
            }
        });

        test('Assigns a user to a group', async () => {
            // Retrieve a user
            const userResponse = await axios.get(`${baseURL}/Users`);
            assert.strictEqual(userResponse.status, 200);
            assert.strictEqual(userResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const user = userResponse.data.Resources[0];
            assert.ok(user, 'User should exist');

            // Retrieve a group
            const groupResponse = await axios.get(`${baseURL}/Groups`);
            assert.strictEqual(groupResponse.status, 200);
            assert.strictEqual(groupResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const group = groupResponse.data.Resources[0];
            assert.ok(group, 'Group should exist');

            // Assign the user to the group
            const patchResponse = await axios.patch(`${baseURL}/Groups/${group.id}`, {
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
            assert.strictEqual(patchResponse.status, 200);
            assert.strictEqual(patchResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group');
            assert.ok(patchResponse.data.members.some(member => member.value === user.id), 'User should be assigned to the group');
        });
    });
}

module.exports = runTests;