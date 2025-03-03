const path = require('path');
const axios = require('axios');
const { getAxiosInstance, getConfig } = require('./src/helpers');

const config = getConfig();
console.log('Configuration:', config);

var runTests = require('./src/basics.js');
runTests(config);
runTests = require('./src/resourcetypes.js');
runTests(config);

var { runTests } = require('./src/schemas.js');
runTests(config);

// Function to process schemas and resource types
function processResourcesAndSchemas(resourceTypes, schemas) {
    // get schema and schema extensions for user
    const userResourceType = resourceTypes.find(e => e.name === 'Users');
    const userSchemaId = userResourceType.schema;
    const userSchemaExtensionsIds = userResourceType.schemaExtensions;

    const userSchema = schemas.find(e => e.id === userSchemaId);
    const userSchemaExtensions = schemas.filter(e => userSchemaExtensionsIds && userSchemaExtensionsIds.includes(e.id));

    const groupResourceType = resourceTypes.find(e => e.name === 'Groups');
    const groupSchemaId = groupResourceType.schema;
    const groupSchemaExtensionsIds = groupResourceType.schemaExtensions;

    const groupSchema = schemas.find(e => e.id === 'urn:ietf:params:scim:schemas:core:2.0:Group');
    const groupSchemaExtensions = schemas.filter(e => groupSchemaExtensionsIds && groupSchemaExtensionsIds.includes(e.id));

    runTests = require('./src/users.js');
    runTests(userSchema, userSchemaExtensions, config);

    var runTests = require('./src/groups.js');
    runTests(groupSchema, groupSchemaExtensions, config);
}

// Initialize what we have and what we need to fetch
const axiosInstance = getAxiosInstance();
let resourceTypesPromise, schemasPromise;

// Set up promises based on what's available in config
if (config.resourceTypes) {
    resourceTypesPromise = Promise.resolve(config.resourceTypes);
} else {
    resourceTypesPromise = axiosInstance.get('/ResourceTypes')
        .then(response => response.data.Resources);
}

if (config.schemas) {
    schemasPromise = Promise.resolve(config.schemas);
} else {
    schemasPromise = axiosInstance.get('/Schemas')
        .then(response => response.data.Resources);
}

// Wait for both promises to resolve
Promise.all([resourceTypesPromise, schemasPromise])
    .then(([resourceTypes, schemas]) => {
        processResourcesAndSchemas(resourceTypes, schemas);
    })
    .catch(error => {
        console.error('Error fetching SCIM resources:', error);
    });
