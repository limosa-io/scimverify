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

function verifyUser(user, schema, schemaExtensions = []) {
    // Ensure the user contains no other attributes then defined in the schema. Note that attributes of the default schema may be at the root level or at the schema level
    const coreOrDefaultAttributes = [...Object.keys(user), ...Object.keys(user[schema.id] ?? {})];
    // ensure coreOrDefaultAttributes are mentioned in the schema, ignore extensions
    const schemaAttributes = schema.attributes.map(attr => attr.name);
    const schemas = [schema.id, ...(schemaExtensions.map(ext => ext.id) ?? [])];
    coreOrDefaultAttributes.forEach(attr => {
        assert.ok(
            schemaAttributes.includes(attr) || schemas.includes(attr) || ['schemas', 'id', 'meta'].includes(attr),
            `User contains attribute not defined in schema: ${attr}`
        );
    });
}

function createUserBody(user, schema, schemaExtensions){
    // find all required attributes

}


function runTests(schema, schemaExtensions = []) {
    test.describe('/Users', () => {

        // before all, ensure schema is set
        test.beforeEach(() => {
            if (!schema) {
                test.skip('Schema is not set');
            }
        });

        test('Retrieves a list of users', async () => {
            const response = await axios.get(`${baseURL}/Users`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            sharedState.users = response.data.Resources;

            // for each resource, ensure it contains no other attributes then defined in the schema
            sharedState.users.forEach(user => {
                verifyUser(user, schema, schemaExtensions);
            });
        });

        test('Retrieves a single user', async () => {
            if (!sharedState.users || sharedState.users.length === 0) {
                test.skip('Previous test failed or no users found in shared state');
                return;
            }
            const firstUser = sharedState.users[0];
            const response = await axios.get(`${baseURL}/Users/${firstUser.id}`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User');
            assert.strictEqual(response.data.id, firstUser.id);
            verifyUser(response.data, schema, schemaExtensions);
            assert.ok(
                response.headers['content-type'] === 'application/scim+json' ||
                response.headers['content-type'] === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing user', async () => {
            try {
                await axios.get(`${baseURL}/Users/9876543210123456`);
                assert.fail('Expected error not thrown');
            } catch (error) {
                assert.strictEqual(error.response.status, 404);
                assert.strictEqual(error.response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error');
            }
        });

        test('Paginates users using startIndex', async () => {
            const startIndex = 20;
            const count = 5;
            const response = await axios.get(`${baseURL}/Users?startIndex=${startIndex}&count=${count}`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            assert.ok(response.data.Resources.length <= count, 'Number of resources should be less than or equal to count');
            assert.strictEqual(response.data.startIndex, startIndex, 'startIndex should match the requested startIndex');
        });

        test('Sorts users by userName', async () => {
            const response = await axios.get(`${baseURL}/Users?sortBy=userName`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const users = response.data.Resources;
            for (let i = 1; i < users.length; i++) {
                assert.ok(users[i - 1].userName <= users[i].userName, 'Users should be sorted by userName');
            }
        });

        test('Retrieves only userName attributes', async () => {
            const attributes = 'userName';
            const response = await axios.get(`${baseURL}/Users?attributes=${attributes}`);
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse');
            const users = response.data.Resources;
            users.forEach(user => {
                assert.ok(user.hasOwnProperty('userName'), 'User should have userName attribute');
            });
        });

        test('Creates a new user - Alternative 1', async () => {
            // find required attributes from the schema
            const newUser = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                userName: `testuser${Math.floor(Math.random() * 10000)}`,
                emails: [
                    {
                        value: 'barbara.jensen@example.com'
                    }
                ]
            };

            const response = await axios.post(`${baseURL}/Users`, newUser);
            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User');
            assert.strictEqual(
                response.data.userName || response.data['urn:ietf:params:scim:schemas:core:2.0:User'].userName,
                newUser.userName
            );

            // Store the created user in shared state for further tests
            sharedState.createdUser = response.data;
        });

        test('Creates a new user - Alternative 2', async () => {
            // find required attributes from the schema
            const userName = `testuser${Math.floor(Math.random() * 10000)}`;
            const newUser = {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                'urn:ietf:params:scim:schemas:core:2.0:User': {
                    userName: userName,
                    emails: [
                        {
                            value: 'barbara.jensen@example.com'
                        }
                    ]
                }
            };

            const response = await axios.post(`${baseURL}/Users`, newUser);
            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User');
            assert.strictEqual(
                response.data.userName || response.data['urn:ietf:params:scim:schemas:core:2.0:User'].userName,
                userName
            );
            // Store the created user in shared state for further tests
            sharedState.createdUser = response.data;
        });

        test('Updates a user using PUT', async () => {
            // TODO: get user from retrieved users, do not use created user
            if (!sharedState.createdUser) {
                test.skip('Previous test failed or no user created in shared state');
                return;
            }

            // Update the created user
            const updatedUser = {
                ...sharedState.createdUser,
                userName: `updated${sharedState.createdUser.userName}`
            };

            const updateResponse = await axios.put(`${baseURL}/Users/${sharedState.createdUser.id}`, updatedUser);
            assert.strictEqual(updateResponse.status, 200);
            assert.strictEqual(updateResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User');
            assert.strictEqual(updateResponse.data.userName, updatedUser.userName);

            // Update the shared state with the updated user
            sharedState.updatedUser = updateResponse.data;
        });

        test('Updates a user using PATCH', async () => {
            // TODO: get user from retrieved users, do not use created user
            // TODO: test other operations
            if (!sharedState.updatedUser) {
                test.skip('Previous test failed or no user updated in shared state');
                return;
            }

            const patchData = {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: [
                    {
                        op: 'replace',
                        path: 'userName',
                        value: `patched${sharedState.updatedUser.userName}`
                    }
                ]
            };

            const patchResponse = await axios.patch(`${baseURL}/Users/${sharedState.updatedUser.id}`, patchData);
            assert.strictEqual(patchResponse.status, 200);
            assert.strictEqual(patchResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User');
            assert.strictEqual(patchResponse.data.userName, patchData.Operations[0].value);

            // Update the shared state with the patched user
            sharedState.patchedUser = patchResponse.data;
        });

        test('Deletes a user', async () => {
            if (!sharedState.patchedUser) {
                test.skip('Previous test failed or no user patched in shared state');
                return;
            }

            const response = await axios.delete(`${baseURL}/Users/${sharedState.patchedUser.id}`);
            assert.strictEqual(response.status, 204);
        });
    });
}

module.exports = runTests;
