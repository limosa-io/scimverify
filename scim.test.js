const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./src/setup.js');


var runTests = require('./src/basics.js');
runTests();
runTests = require('./src/resourcetypes.js');
runTests();


// import getSchema
var { runTests } = require('./src/schemas.js');
runTests();


axios.get(`${config.baseURL}/ResourceTypes`).then(responseResourceTypes => {
    axios.get(`${config.baseURL}/Schemas`).then(responseSchemas => {
        // get schema and schema extensions for user
        const userResourceType = responseResourceTypes.data.Resources.find(e => e.name === 'Users');
        const userSchemaId = userResourceType.schema;
        const userSchemaExtensionsIds = userResourceType.schemaExtensions;

        const userSchema = responseSchemas.data.Resources.find(e => e.id === userSchemaId);
        const userSchemaExtensions = responseSchemas.data.Resources.filter(e => userSchemaExtensionsIds.includes(e.id));

        runTests = require('./src/users.js');
        runTests(userSchema, userSchemaExtensions);

        var runTests = require('./src/groups.js');
        runTests();
    });
});



