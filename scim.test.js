import path from 'path';
import axios from 'axios';
import { getAxiosInstance, getConfig } from './src/helpers.js';

const config = getConfig();

import runBasicTests from './src/basics.js';
runBasicTests(config);
import runUserTests from './src/users.js';
import runGroupTests from './src/groups.js';
import runResourceTypeTests from './src/resourcetypes.js';
import { runTests as runSchemaTests } from './src/schemas.js';

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

    const groupSchema = schemas.find(e => e.id === groupSchemaId);
    const groupSchemaExtensions = schemas.filter(e => groupSchemaExtensionsIds && groupSchemaExtensionsIds.includes(e.id));
        
    runUserTests(userSchema, userSchemaExtensions, config);
    runGroupTests(groupSchema, groupSchemaExtensions, config);
}

// Initialize what we have and what we need to fetch
const axiosInstance = getAxiosInstance();
let resourceTypesPromise, schemasPromise;

// Set up promises based on what's available in config
if (config.resourceTypes) {
    resourceTypesPromise = Promise.resolve(config.resourceTypes);
} else {
    
    runResourceTypeTests(config);
    resourceTypesPromise = axiosInstance.get('/ResourceTypes')
        .then(response => response.data.Resources);
}

if (config.schemas) {
    schemasPromise = Promise.resolve(config.schemas);
} else {
    
    runSchemaTests(config);
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
