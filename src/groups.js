import test from 'node:test';
import assert from 'node:assert';
import { getAxiosInstance, canonicalize } from './helpers.js';
import dotenv from 'dotenv';
import Ajv from 'ajv';

dotenv.config();

const sharedState = {};

function verifyGroup(group, schema, schemaExtensions = []) {
    // Ensure the group contains no other attributes then defined in the schema
    const coreOrDefaultAttributes = [...Object.keys(group), ...Object.keys(group[schema.id] ?? {})];
    // ensure coreOrDefaultAttributes are mentioned in the schema, ignore extensions
    const schemaAttributes = schema.attributes.map(attr => attr.name);
    const schemas = [schema.id, ...(schemaExtensions.map(ext => ext.id) ?? [])];
    coreOrDefaultAttributes.forEach(attr => {
        assert.ok(
            schemaAttributes.includes(attr) || schemas.includes(attr) || ['schemas', 'id', 'meta'].includes(attr),
            `Group contains attribute not defined in schema: ${attr}`
        );
    });
}

async function populateUserIds(request, configuration, t){
    // request from JSON to string
    const requestString = JSON.stringify(request);
    // Get the user ID first
    const userId = await lookupUserId(configuration, t);
    // replace each occurrence of AUTO with the actual user ID
    const replacedString = requestString.replace(/AUTO/g, userId);
    // return string to JSON
    return JSON.parse(replacedString);
}

async function lookupUserId(configuration, t){
    const axios = getAxiosInstance(configuration, t);
    const response = await axios.get('/Users?count=1');
    if (response.data.Resources.length > 0) {
        return response.data.Resources[0].id;
    }
    return null;
}

function runTests(groupSchema, groupSchemaExtensions = [], configuration) {
    return test.describe('Groups', async () => {
        test('groupSchema contains attribute displayName and it is marked as required', () => {
            const displayNameAttribute = groupSchema.attributes.find(attr => attr.name === 'displayName');
            assert.ok(displayNameAttribute, 'displayName attribute should exist in groupSchema');
            assert.strictEqual(displayNameAttribute.required, true, 'displayName attribute should be marked as required');
        });

        // before all, ensure schema is set
        test.beforeEach(() => {
            if (!groupSchema) {
                t.skip('Schema is not set');
                return;
            }
        });

        test('Retrieves a list of groups', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Groups');
            assert.strictEqual(response.status, 200, 'GET /Groups should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should contain the correct schema');
            const expectedAttributes = ['totalResults', 'itemsPerPage', 'startIndex', 'schemas', 'Resources'];
            const actualAttributes = Object.keys(response.data);
            assert.deepStrictEqual(actualAttributes.sort(), expectedAttributes.sort(), 'Response attributes do not match expected attributes');
            sharedState.groups = response.data.Resources;
            
            // Verify each group against the schema
            if (sharedState.groups && sharedState.groups.length > 0) {
                sharedState.groups.forEach(group => {
                    verifyGroup(group, groupSchema, groupSchemaExtensions);
                });
            }
        });

        test('Retrieves a single group', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            if (!sharedState.groups || sharedState.groups.length === 0) {
                t.skip('Previous test failed or no groups found in shared state');
                return;
            }
            const firstGroup = sharedState.groups[0];
            const response = await testAxios.get(`/Groups/${firstGroup.id}`);
            assert.strictEqual(response.status, 200, 'GET /Groups/{id} should return status code 200');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Response should contain the correct schema');
            assert.strictEqual(response.data.id, firstGroup.id, 'Returned group ID should match requested group ID');
            assert.ok(response.data.displayName, 'Group should contain displayName attribute');
            // Strip content type parameters (charset, boundary) from content-type header
            const contentType = response.headers['content-type']?.split(';')[0].trim();
            assert.ok(
                contentType === 'application/scim+json' ||
                contentType === 'application/json',
                'Content-Type should be either application/scim+json or application/json'
            );
        });

        test('Handles retrieval of a non-existing group', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Groups/9876543210123456');
            assert.strictEqual(response.status, 404, 'A non-existing group should return 404');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should contain the correct error schema');
        });

        test('Paginates groups using startIndex', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const startIndex = 20;
            const count = 5;
            const response = await testAxios.get(`/Groups?startIndex=${startIndex}&count=${count}`);
            assert.strictEqual(response.status, 200, 'Pagination request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            assert.ok(response.data.Resources.length <= count, 'Number of resources should be less than or equal to count');
            assert.strictEqual(response.data.startIndex, startIndex, 'startIndex should match the requested startIndex');
        });

        test('Sorts groups by displayName', async (t) => {
            const testAxios = getAxiosInstance(configuration, t);
            const response = await testAxios.get('/Groups?sortBy=displayName');
            assert.strictEqual(response.status, 200, 'Sort request should return 200 OK');
            assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Response should use the correct SCIM list response schema');
            const groups = response.data.Resources;
            for (let i = 1; i < groups.length; i++) {
                assert.ok(groups[i - 1].displayName <= groups[i].displayName, 'Groups should be sorted by displayName');
            }
        });

        if (configuration?.groups?.operations?.includes('POST')) {
            for (const [index, creation] of (configuration.groups.post_tests || []).entries()) {
                test(`Creates a new group - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    creation.request = await populateUserIds(creation.request, configuration, t);

                    const response = await testAxios.post('/Groups', creation.request);
                    assert.strictEqual(response.status, 201, 'POST /Groups should return status code 201 when creating a new group');

                    // Verify response matches the expected response format
                    if (creation.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(creation.response, canonicalize(response.data, groupSchema) );
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }

                    // Store the created group in shared state for further tests
                    sharedState.createdGroup = response.data;
                });
            }

            test('Returns errors when creating an invalid group', async (t) => {
                const testAxios = getAxiosInstance(configuration, t);
                // displayName is always required
                const newGroup = {
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
                };

                const response = await testAxios.post('/Groups', newGroup);
                assert.strictEqual(response.status, 400, 'Creating an invalid group should return status code 400');
                assert.strictEqual(response.data.scimType, "invalidSyntax", 'Error should have scimType set to invalidSyntax');
                assert.strictEqual(response.data.status, 400, 'Error response status should match HTTP status code');
                assert.strictEqual(response.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:Error', 'Error response should contain the correct error schema');
            });
        }

        if (configuration?.groups?.operations?.includes('PUT')) {
            for (const [index, update] of (configuration.groups.put_tests || []).entries()) {
                test(`Updates a group using PUT - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    const replaceId = !update.id || update.id === 'AUTO' ? sharedState.groups?.[0]?.id : update.id;
                    
                    update.request = await populateUserIds(update.request, configuration, t);

                    if (!replaceId) {
                        t.skip('No group found to update');
                        return;
                    }

                    const response = await testAxios.put(`/Groups/${replaceId}`, update.request);
                    assert.strictEqual(response.status, 200, 'Group update should return 200 OK');

                    // Verify response matches the expected response format
                    if (update.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(update.response, canonicalize(response.data, groupSchema));
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }
                });
            }
        }

        if (configuration?.groups?.operations?.includes('PATCH')) {
            for (const [index, patch] of (configuration.groups.patch_tests || []).entries()) {
                test(`Updates a group using PATCH - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    const replaceId = !patch.id || patch.id === 'AUTO' ? sharedState.groups?.[0]?.id : patch.id;

                    if (!replaceId) {
                        t.skip('No group found to patch');
                        return;
                    }

                    patch.request = await populateUserIds(patch.request, configuration, t);

                    const response = await testAxios.patch(`/Groups/${replaceId}`, patch.request);
                    assert.strictEqual(response.status, 200, 'Group patch should return 200 OK');

                    // Verify response matches the expected response format
                    if (patch.response) {
                        const ajv = new Ajv();
                        const valid = ajv.validate(patch.response, canonicalize(response.data, groupSchema));
                        assert.ok(valid, `Response doesn't match the expected schema: ${JSON.stringify(ajv.errors)}`);
                    }
                });
            }

            test('Assigns a user to a group', async (t) => {
                const testAxios = getAxiosInstance(configuration, t);
                // Retrieve a user
                const userResponse = await testAxios.get('/Users');
                assert.strictEqual(userResponse.status, 200, 'GET /Users should return status code 200');
                assert.strictEqual(userResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'User list response should contain the correct schema');
                const user = userResponse.data.Resources[0];
                assert.ok(user, 'User should exist');

                // Retrieve a group
                const groupResponse = await testAxios.get('/Groups');
                assert.strictEqual(groupResponse.status, 200, 'GET /Groups should return status code 200');
                assert.strictEqual(groupResponse.data.schemas[0], 'urn:ietf:params:scim:api:messages:2.0:ListResponse', 'Group list response should contain the correct schema');
                const group = groupResponse.data.Resources[0];
                assert.ok(group, 'Group should exist');

                // Assign the user to the group
                const patchResponse = await testAxios.patch(`/Groups/${group.id}`, {
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
        }

        if (configuration?.groups?.operations?.includes('DELETE')) {
            for (const [index, deletion] of (configuration.groups.delete_tests || []).entries()) {
                await test(`Deletes a group - Alternative ${index + 1}`, async (t) => {
                    const testAxios = getAxiosInstance(configuration, t);

                    const deleteId = !deletion.id || deletion.id === 'AUTO' ? sharedState.createdGroup?.id : deletion.id;

                    if (!deleteId) {
                        t.skip('No group available to delete');
                        return;
                    }

                    const response = await testAxios.delete(`/Groups/${deleteId}`);
                    assert.strictEqual(response.status, 204, 'Group deletion should return 204 No Content');
                });
            }
        }
    });
}

export default runTests;