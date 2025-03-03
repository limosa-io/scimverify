const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getAxiosInstance } = require('./src/helpers');
const config = require('./src/setup.js');

const configFile = process.argv;
console.log(configFile);
const finalConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

console.log(finalConfig);

var runTests = require('./src/basics.js');
runTests(finalConfig);
runTests = require('./src/resourcetypes.js');
runTests(finalConfig);

var { runTests } = require('./src/schemas.js');
runTests(finalConfig);

const axiosInstance = getAxiosInstance(finalConfig);

axiosInstance.get('/ResourceTypes').then(responseResourceTypes => {
    axiosInstance.get('/Schemas').then(responseSchemas => {
        // get schema and schema extensions for user
        const userResourceType = responseResourceTypes.data.Resources.find(e => e.name === 'Users');
        const userSchemaId = userResourceType.schema;
        const userSchemaExtensionsIds = userResourceType.schemaExtensions;

        const userSchema = responseSchemas.data.Resources.find(e => e.id === userSchemaId);
        const userSchemaExtensions = responseSchemas.data.Resources.filter(e => userSchemaExtensionsIds.includes(e.id));

        const groupResourceType = responseResourceTypes.data.Resources.find(e => e.name === 'Groups');
        const groupSchemaId = groupResourceType.schema;
        const groupSchemaExtensionsIds = groupResourceType.schemaExtensions;

        const groupSchema = responseSchemas.data.Resources.find(e => e.id === 'urn:ietf:params:scim:schemas:core:2.0:Group');
        const groupSchemaExtensions = responseSchemas.data.Resources.filter(e => groupSchemaExtensionsIds.includes(e.id));

        runTests = require('./src/users.js');
        runTests(userSchema, userSchemaExtensions, finalConfig);

        var runTests = require('./src/groups.js');

        runTests(groupSchema, groupSchemaExtensions, finalConfig);
    });
});



