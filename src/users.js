import test, { skip } from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance } from './helpers.js';

const sharedState = {};

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

function createUserBody(user, schema, schemaExtensions) {
    // find all required attributes

}

function runTests(userSchema, userSchemaExtensions = [], configuration) {
    const axios = getAxiosInstance();



    test.describe('Users', () => {

        test('userSchema contains attribute userName and it is marked as required', () => {
            const userNameAttribute = userSchema.attributes.find(attr => attr.name === 'userName');
            assert.ok(userNameAttribute, 'userName attribute should exist in userSchema');
            assert.strictEqual(userNameAttribute.required, true, 'userName attribute should be marked as required');
        });

        // before all, ensure schema is set
        test.beforeEach(() => {
            if (!userSchema) {
                t.skip('Schema is not set');
                return; // Add return statement to ensure test is skipped
            }
        });

        test('Retrieves a list of users', async (t) => {
            const response = await axios.get('/Users');
            assert.strictEqual(response.status, 200, 'List users request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');

            assert.ok(response.data.Resources && response.data.Resources.length > 0, 'At least one user should be returned');

            sharedState.users = response.data.Resources;

            // for each resource, ensure it contains no other attributes then defined in the schema
            sharedState.users.forEach(user => {
                verifyUser(user, userSchema, userSchemaExtensions);
            });
        });

        test('Retrieves a single user', async (t) => {
            if (!sharedState.users || sharedState.users.length === 0) {
                t.skip('Previous test failed or no users found in shared state');
                return;
            }
            const firstUser = sharedState.users[0];
            const response = await axios.get(`/Users/${firstUser.id}`);
            assert.strictEqual(response.status, 200, 'Single user request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
            assert.strictEqual(response.data.id, firstUser.id, 'Retrieved user ID should match the requested user ID');
            verifyUser(response.data, userSchema, userSchemaExtensions);
            assert.ok(
                response.headers['content-type'] === 'application/scim+json' ||
                response.headers['content-type'] === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing user', async () => {
            const response = await axios.get('/Users/9876543210123456');
            assert.strictEqual(response.status, 404, 'A non-existing user should return 404');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should use the correct SCIM error schema');

        });

        test('Paginates users using startIndex', async () => {
            const startIndex = 20;
            const count = 5;
            const response = await axios.get(`/Users?startIndex=${startIndex}&count=${count}`);
            assert.strictEqual(response.status, 200, 'Pagination request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            assert.ok(response.data.Resources.length <= count, 'Number of resources should be less than or equal to count');
            assert.strictEqual(response.data.startIndex, startIndex, 'startIndex should match the requested startIndex');
        });

        test('Sorts users by userName', async () => {
            const response = await axios.get('/Users?sortBy=userName');
            assert.strictEqual(response.status, 200, 'Sort request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            for (let i = 1; i < users.length; i++) {
                assert.ok(users[i - 1].userName <= users[i].userName, 'Users should be sorted by userName');
            }
        });

        test('Retrieves only userName attributes', async () => {
            const attributes = 'userName';
            const response = await axios.get(`/Users?attributes=${attributes}`);
            assert.strictEqual(response.status, 200, 'Filtered attributes request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            users.forEach(user => {
                assert.ok(user.hasOwnProperty('userName'), 'User should have userName attribute');
            });
        });

        if (configuration?.users?.enableCreate) {
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

                const response = await axios.post('/Users', newUser);
                assert.strictEqual(response.status, 201, 'User creation should return 201 Created');
                assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
                assert.strictEqual(
                    response.data.userName || response.data['urn:ietf:params:scim:schemas:core:2.0:User'].userName,
                    newUser.userName,
                    'Created user should have the same userName as requested'
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

                const response = await axios.post('/Users', newUser);
                assert.strictEqual(response.status, 201, 'User creation should return 201 Created');
                assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
                assert.strictEqual(
                    response.data.userName || response.data['urn:ietf:params:scim:schemas:core:2.0:User'].userName,
                    userName,
                    'Created user should have the same userName as requested'
                );
                // Store the created user in shared state for further tests
                sharedState.createdUser = response.data;
            });
        }

        if (configuration?.users?.enableReplace) {
            test('Updates a user using PUT', async (t) => {
                // TODO: get user from retrieved users, do not use created user
                if (!(sharedState.users?.[0])) {
                    t.skip('Previous test failed or no user created in shared state');
                    return;
                }

                const user = sharedState.users[0];

                // Update the created user
                const updatedUser = {
                    ...user,
                    userName: `updated${user.userName}`
                };

                const updateResponse = await axios.put(`/Users/${user.id}`, updatedUser);
                assert.strictEqual(updateResponse.status, 200, 'User update should return 200 OK');
                assert.strictEqual(updateResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
                assert.strictEqual(updateResponse.data.userName, updatedUser.userName, 'Updated user should have the new userName');

                // Update the shared state with the updated user
                sharedState.updatedUser = updateResponse.data;
            });
        }

        if (configuration?.users?.enableUpdate) {
            test('Updates a user using PATCH', async (t) => {

                if (!(sharedState.users?.[0])) {
                    t.skip('Previous test failed or no user created in shared state');
                    return;
                }

                const user = sharedState.users[0];

                const patchData = {
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                    Operations: [
                        {
                            op: 'replace',
                            path: 'userName',
                            value: `patched${user.userName}`
                        }
                    ]
                };

                const patchResponse = await axios.patch(`/Users/${user.id}`, patchData);
                assert.strictEqual(patchResponse.status, 200, 'User patch should return 200 OK');
                assert.strictEqual(patchResponse.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
                assert.strictEqual(patchResponse.data.userName, patchData.Operations[0].value, 'Patched user should have the new userName');

                // Update the shared state with the patched user
                sharedState.patchedUser = patchResponse.data;
            });
        }

        if (configuration?.users?.enableDelete) {
            test('Deletes a user', async (t) => {

                if (!(sharedState.users?.[0])) {
                    t.skip('Previous test failed or no user created in shared state');
                    return;
                }

                const user = sharedState.users[0];

                const response = await axios.delete(`/Users/${user.id}`);
                assert.strictEqual(response.status, 204, 'User deletion should return 204 No Content');
            });
        }
    });
}

export default runTests;
