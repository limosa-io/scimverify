import path from 'path';
import axios from 'axios';
import { getAxiosInstance, writeHarFile, clearHarEntries } from './src/helpers.js';

import runBasicTests from './src/basics.js';
import runUserTests from './src/users.js';
import runGroupTests from './src/groups.js';
import runResourceTypeTests from './src/resourcetypes.js';
import { runTests as runSchemaTests } from './src/schemas.js';
import fs from 'fs/promises';
import { parse } from 'yaml'

// Function to process schemas and resource types
async function processResourcesAndSchemas(config, resourceTypes, schemas) {
    // Only process user resource type and schema if enabled
    if (config?.users?.enabled) {
        const userResourceType = resourceTypes.find(e => e.name === 'User');
        if (userResourceType) {
            const userSchemaId = userResourceType.schema;
            const userSchemaExtensionsIds = userResourceType.schemaExtensions?.map(r => r.schema);
            const userSchema = schemas.find(e => e.id === userSchemaId);
            const userSchemaExtensions = schemas.filter(e => userSchemaExtensionsIds && userSchemaExtensionsIds.includes(e.id));
            await runUserTests(userSchema, userSchemaExtensions, config);
        }
    }

    // Only process group resource type and schema if enabled
    if (config?.groups?.enabled) {
        const groupResourceType = resourceTypes.find(e => e.name === 'Group');
        if (groupResourceType) {
            const groupSchemaId = groupResourceType.schema;
            const groupSchemaExtensionsIds = groupResourceType.schemaExtensions?.map(r => r.schema);
            const groupSchema = schemas.find(e => e.id === groupSchemaId);
            const groupSchemaExtensions = schemas.filter(e => groupSchemaExtensionsIds && groupSchemaExtensionsIds.includes(e.id));
            await runGroupTests(groupSchema, groupSchemaExtensions, config);
        }
    }
}

// Define the main function that runs all tests
export async function runAllTests(config) {
    // Initialize what we have and what we need to fetch
    const axiosInstance = getAxiosInstance(config);
    let resourceTypesPromise, schemasPromise;

    if (config?.detectResourceTypes) {
        await runResourceTypeTests(config);
        resourceTypesPromise = axiosInstance.get('/ResourceTypes')
            .then(response => response.data.Resources);
    } else {
        // Import resource types from file since detectResourceTypes is false
        resourceTypesPromise = fs.readFile(path.resolve('./src/resourceTypes.json'), 'utf8')
            .then(data => JSON.parse(data).Resources)
            .then(resourceTypes => Promise.resolve(resourceTypes));
    }


    if (config?.detectSchema) {
        await runSchemaTests(config);
        schemasPromise = axiosInstance.get('/Schemas')
            .then(response => response.data.Resources);
    } else {
        // Import schemas from file since detectSchema is false
        schemasPromise = fs.readFile(path.resolve('./src/schemas.json'), 'utf8')
            .then(data => JSON.parse(data).Resources)
            .then(schemas => Promise.resolve(schemas));
    }

    try {
        await runBasicTests(config);
        const [resourceTypes, schemas] = await Promise.all([resourceTypesPromise, schemasPromise]);
        await processResourcesAndSchemas(config, resourceTypes, schemas);
        return { success: true };
    } catch (error) {
        console.error('Error fetching SCIM resources:', error);
        return { success: false, error };
    }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.env.CONFIG_FILE) {
        // If a config file is provided, read it and parse it
        const configFilePath = path.resolve(process.cwd(), process.env.CONFIG_FILE);
        process.env.CONFIG = await fs.readFile(configFilePath, 'utf8');
    }

    if (!process.env.CONFIG) {
        // If no config file is provided, check if the config is passed as an environment variable
        console.error('No CONFIG or CONFIG_FILE environment variable provided. Exiting.');
        process.exit(1);
    }

    try {
        parse(process.env.CONFIG);
    } catch (error) {
        console.error('Invalid YAML configuration provided:', error.message);
        process.exit(1);
    }

    // Check if the configuration is valid
    if (!process.env.BASE_URL) {
        console.error('Environment variable BASE_URL is required');
        process.exit(1);
    }
    if (!process.env.AUTH_HEADER) {
        console.error('Environment variable AUTH_HEADER is required');
        process.exit(1);
    }

    // Run the tests by default when the file is imported
    runAllTests(
        {
            baseURL: process.env.BASE_URL,
            authHeader: process.env.AUTH_HEADER,
            skipTlsVerification: !!process.env.SKIP_TLS_VERIFICATION,
            ...parse(process.env.CONFIG),
        }
    ).then((result) => {
        if (!result.success) {
            process.exit(1);
        }
    }).catch((error) => {
        console.error('Error running tests:', error);
        process.exit(1);
    }).finally(() => {
        if(process.env.HAR_FILE_NAME) {
            // Make sure the HAR file has the correct extension
            let harFileName = process.env.HAR_FILE_NAME;
            if (!harFileName.toLowerCase().endsWith('.har')) {
                harFileName += '.har';
            }

            console.log('Writing HAR file:', harFileName);

            writeHarFile(harFileName);
        }

        clearHarEntries();

    });
}