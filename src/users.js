import test, { skip } from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance, getConfig } from './helpers.js';
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
            `User contains attribute not defined in schema: ${attr}`
        );
    });
}

function createUserBody(user, schema, schemaExtensions) {
    // find all required attributes

}

function ensureCoreSchemaAttributesAreSchemaless(user) {
    if (!user) {
        return null;
    }

    if (!user['schemas']) {
        user['schemas'] = ['urn:ietf:params:scim:schemas:core:2.0:User'];
    }

    if (user['urn:ietf:params:scim:schemas:core:2.0:User']) {
        // merge contents of user['urn:ietf:params:scim:schemas:core:2.0:User] with user
        const coreSchemaContent = user['urn:ietf:params:scim:schemas:core:2.0:User'];
        for (const key in coreSchemaContent) {
            user[key] = coreSchemaContent[key];
        }
        delete user['urn:ietf:params:scim:schemas:core:2.0:User'];
    }
}

function ensureExplicitSchemas(user) {
    if (!user) {
        return null;
    }

    if (!user['schemas']) {
        user['schemas'] = ['urn:ietf:params:scim:schemas:core:2.0:User'];
    }

    // move each attribute that does not contain a colon to user[''urn:ietf:params:scim:schemas:core:2.0:User']
    const coreAttrs = {};
    for (const key in user) {
        if (!key.includes(':') && !['schemas', 'id', 'meta'].includes(key)) {
            coreAttrs[key] = user[key];
            delete user[key];
        }
    }

    if (Object.keys(coreAttrs).length > 0) {
        user['urn:ietf:params:scim:schemas:core:2.0:User'] = user['urn:ietf:params:scim:schemas:core:2.0:User'] || {};
        Object.assign(user['urn:ietf:params:scim:schemas:core:2.0:User'], coreAttrs);
    }
    return user;

}

function runTests(userSchema, userSchemaExtensions = [], configuration) {
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
            const testAxios = getAxiosInstance(getConfig(), t);
            const response = await testAxios.get('/Users');
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
            const testAxios = getAxiosInstance(getConfig(), t);
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
            assert.ok(
                response.headers['content-type'] === 'application/scim+json' ||
                response.headers['content-type'] === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing user', async (t) => {
            const testAxios = getAxiosInstance(getConfig(), t);
            const response = await testAxios.get('/Users/9876543210123456');
            assert.strictEqual(response.status, 404, 'A non-existing user should return 404');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should use the correct SCIM error schema');

        });

        test('Paginates users using startIndex', async (t) => {
            const testAxios = getAxiosInstance(getConfig(), t);
            const startIndex = 20;
            const count = 5;
            const response = await testAxios.get(`/Users?startIndex=${startIndex}&count=${count}`);
            assert.strictEqual(response.status, 200, 'Pagination request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            assert.ok(response.data.Resources.length <= count, 'Number of resources should be less than or equal to count');
            assert.strictEqual(response.data.startIndex, startIndex, 'startIndex should match the requested startIndex');
        });

        test('Sorts users by userName', async (t) => {
            const testAxios = getAxiosInstance(getConfig(), t);
            const response = await testAxios.get('/Users?sortBy=userName');
            assert.strictEqual(response.status, 200, 'Sort request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            for (let i = 1; i < users.length; i++) {
                assert.ok(users[i - 1].userName <= users[i].userName, 'Users should be sorted by userName');
            }
        });

        test('Retrieves only userName attributes', async (t) => {
            const testAxios = getAxiosInstance(getConfig(), t);
            const attributes = 'userName';
            const response = await testAxios.get(`/Users?attributes=${attributes}`);
            assert.strictEqual(response.status, 200, 'Filtered attributes request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const users = response.data.Resources;
            users.forEach(user => {
                assert.ok(user.hasOwnProperty('userName'), 'User should have userName attribute');
            });
        });

        if (configuration?.users?.enableCreate) {

            if (configuration.createTemplate) {
                test('Confirm example user is valid SCIM format', () => {
                    const user = configuration.createTemplate;
                    verifyUser(user, userSchema, userSchemaExtensions);

                });
            }

            for (const [index, creation] of configuration.creations.entries()) {
                test(`Creates a new user - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(getConfig(), t);
                    // find required attributes from the schema
                    const response = await testAxios.post('/Users', creation.request);
                    assert.strictEqual(response.status, 201, 'User creation should return 201 Created');

                    // Verify response matches the expected response format
                    if (creation.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(creation.response, response.data);
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }

                    // Store the created user in shared state for further tests
                    sharedState.createdUser = response.data;
                });
            }
        }

        if (configuration?.users?.enableReplace) {
            for (const [index, update] of configuration.puts.entries()) {
                test('Updates a user using PUT', async (t) => {
                    const testAxios = getAxiosInstance(getConfig(), t);

                    const replaceId = configuration.users.updateId ?? sharedState.users?.[0]?.id;

                    // TODO: get user from retrieved users, do not use created user
                    if (!replaceId) {
                        t.skip('Previous test failed or no user created in shared state');
                        return;
                    }

                    const response = await testAxios.put(`/Users/${replaceId}`, update.request);
                    assert.strictEqual(response.status, 200, 'User update should return 200 OK');

                    // Verify response matches the expected response format
                    if (update.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(update.response, response.data);
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }
                });
            }
        }

        if (configuration?.users?.enableUpdate) {
            for(const [index, patch] of configuration.patches.entries()) {
                test('Updates a user using PATCH - Alternative ', async (t) => {
                    const testAxios = getAxiosInstance(getConfig(), t);

                    const replaceId = configuration.users.updateId ?? sharedState.users?.[0]?.id;

                    if (!replaceId) {
                        t.skip('Previous test failed or no user created in shared state');
                        return;
                    }

                    const response = await testAxios.patch(`/Users/${replaceId}`, patch.request);
                    assert.strictEqual(response.status, 200, 'User patch should return 200 OK');

                    // Verify response matches the expected response format
                    if (patch.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(patch.response, response.data);
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }

                });
            }
        }

        if (configuration?.users?.enableDelete) {
            test('Deletes a user', async (t) => {
                const testAxios = getAxiosInstance(getConfig(), t);

                const deleteId = configuration.users.deleteId ?? sharedState.users?.[0]?.id;

                if (!deleteId) {
                    t.skip('Previous test failed or no user created in shared state');
                    return;
                }

                const response = await testAxios.delete(`/Users/${deleteId}`);
                assert.strictEqual(response.status, 204, 'User deletion should return 204 No Content');
            });
        }
    });
}

export default runTests;
