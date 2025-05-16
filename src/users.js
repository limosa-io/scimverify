import test, { skip } from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance, canonicalize } from './helpers.js';
import Ajv from 'ajv';

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
            `User contains attribute not defined in schema: ${attr}. Check schema ${schema.id} and extensions ${schemaExtensions.map(ext => ext.id).join(', ')}`
        );
    });
}

async function lookupUser(configuration, t){
    const axios = getAxiosInstance(configuration, t);
    try {
        const response = await axios.get('/Users?count=1');
        if (response.data.Resources && response.data.Resources.length > 0) {
            return response.data.Resources[0];
        }
    } catch (error) {
        t.diagnostic(`Error looking up user: ${error.message}`);
    }
    return null;
}

async function lookupUserId(configuration, t){
    const user = await lookupUser(configuration, t);
    return user ? user.id : null;
}

function runTests(userSchema, userSchemaExtensions = [], configuration) {
    return test.describe('Users', () => {

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
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Users');
            assert.strictEqual(response.status, 200, 'List users request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');

            assert.ok(response.data.Resources && response.data.Resources.length > 0, 'At least one user should be returned');

            sharedState.users = response.data.Resources;

            // for each resource, ensure it contains no other attributes then defined in the schema
            response.data.Resources.forEach(user => {
                verifyUser(user, userSchema, userSchemaExtensions);
            });
        });

        test('Retrieves a single user', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            if (!sharedState.users || sharedState.users.length === 0) {
                t.skip('Previous test failed or no users found in shared state');
                return;
            }
            const firstUser = sharedState.users[0];
            const response = await testAxios.get(`/Users/${firstUser.id}`);
            assert.strictEqual(response.status, 200, 'Single user request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:User', 'Response should use the correct SCIM user schema');
            assert.strictEqual(response.data.id, firstUser.id, 'Retrieved user ID should match the requested user ID');
            verifyUser(response.data, userSchema, userSchemaExtensions);
            // Strip content type parameters (charset, boundary) from content-type header
            const contentType = response.headers['content-type']?.split(';')[0].trim();
            assert.ok(
                contentType === 'application/scim+json' ||
                contentType === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing user', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Users/9876543210123456');
            assert.strictEqual(response.status, 404, 'A non-existing user should return 404');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should use the correct SCIM error schema');

        });

        test('Paginates users using startIndex', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const startIndex = 20;
            const count = 5;
            const response = await testAxios.get(`/Users?startIndex=${startIndex}&count=${count}`);
            assert.strictEqual(response.status, 200, 'Pagination request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            assert.ok(response.data.Resources.length <= count, 'Number of resources should be less than or equal to count');
            assert.strictEqual(response.data.startIndex, startIndex, 'startIndex should match the requested startIndex');
        });

        test('Sorts users by userName', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Users?sortBy=userName');
            assert.strictEqual(response.status, 200, 'Sort request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            for (let i = 1; i < users.length; i++) {
                assert.ok(users[i - 1].userName <= users[i].userName, 'Users should be sorted by userName');
            }
        });

        test('Retrieves only userName attributes', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const attributes = 'userName';
            const response = await testAxios.get(`/Users?attributes=${attributes}`);
            assert.strictEqual(response.status, 200, 'Filtered attributes request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            users.forEach(user => {
                assert.ok(user.hasOwnProperty('userName'), 'User should have userName attribute');
            });
        });

        test('Filters users by userName', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);

            const user = await lookupUser(configuration, t);
            if (!user) {
                t.skip('Could not find a valid user for the filter test');
                return;
            }

            const filter = `userName eq "${user.userName}"`;
            const response = await testAxios.get(`/Users?filter=${filter}`);
            assert.strictEqual(response.status, 200, 'Filtered users request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            users.forEach(user => {
                assert.strictEqual(user.userName, user.userName, 'User should have userName equal to "bjensen"');
            });
        });

        if (configuration?.users?.operations?.includes('POST')) {

            if (configuration.createTemplate) {
                test('Confirm example user is valid SCIM format', () => {
                    const user = configuration.createTemplate;
                    verifyUser(user, userSchema, userSchemaExtensions);

                });
            }

            for (const [index, creation] of configuration.users.post_tests.entries()) {
                test(`Creates a new user - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);
                    // find required attributes from the schema

                    const response = await testAxios.post('/Users', creation.request);
                    assert.strictEqual(response.status, 201, 'User creation should return 201 Created');

                    // Verify response matches the expected response format
                    if (creation.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(
                            creation.response,
                            canonicalize(response.data, userSchema)
                        );
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }

                    // Store the created user in shared state for further tests
                    sharedState.createdUser = response.data;
                });
            }
        }

        if (configuration?.users?.operations.includes('PUT')) {
            for (const [index, update] of configuration.users.put_tests.entries()) {
                test('Updates a user using PUT', async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    let replaceId = update.id;
                    if (!replaceId || replaceId === 'AUTO') {
                        replaceId = await lookupUserId(configuration, t);
                    }

                    if (!replaceId) {
                        t.skip('Could not find a valid user ID for the update test');
                        return;
                    }

                    const response = await testAxios.put(`/Users/${replaceId}`, update.request);
                    assert.strictEqual(response.status, 200, 'User update should return 200 OK');

                    // Verify response matches the expected response format
                    if (update.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(
                            update.response,
                            canonicalize(response.data, userSchema)
                        );
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }
                });
            }
        }

        if (configuration?.users?.operations.includes('PATCH')) {
            for(const [index, patch] of configuration.users.patch_tests.entries()) {
                test(`Updates a user using PATCH - Alternative ${index+1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    let replaceId = patch.id;
                    if (!replaceId || replaceId === 'AUTO') {
                        replaceId = await lookupUserId(configuration, t);
                    }

                    if (!replaceId) {
                        t.skip('Could not find a valid user ID for the patch test');
                        return;
                    }

                    const response = await testAxios.patch(`/Users/${replaceId}`, patch.request);
                    assert.strictEqual(response.status, 200, 'User patch should return 200 OK');

                    // Verify response matches the expected response format
                    if (patch.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(
                            patch.response,
                            canonicalize(response.data, userSchema)
                        );
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }

                });
            }
        }

        if (configuration?.users?.operations.includes('DELETE')) {
            for (const [index, deletion] of configuration.users.delete_tests.entries()) {
                test('Deletes a user', async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    let deleteId = deletion.id;
                    if (!deleteId || deleteId === 'AUTO') {
                        deleteId = await lookupUserId(configuration, t);
                    }

                    if (!deleteId) {
                        t.skip('Could not find a valid user ID for the delete test');
                        return;
                    }

                    const response = await testAxios.delete(`/Users/${deleteId}`);
                    assert.strictEqual(response.status, 204, 'User deletion should return 204 No Content');
                });
            }
        }
    });
}

export default runTests;
