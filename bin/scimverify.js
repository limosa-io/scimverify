#!/usr/bin/env node

import { runAllTests } from '../index.js';
import { parse } from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeHarFile, clearHarEntries } from '../src/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
let configPath = null;
let baseUrl = null;
let authHeader = null;
let harFileName = null;
let skipTlsVerification = false;

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--config' || arg === '-c') {
    configPath = args[++i];
  } else if (arg === '--base-url' || arg === '-b') {
    baseUrl = args[++i];
  } else if (arg === '--auth-header' || arg === '-a') {
    authHeader = args[++i];
  } else if (arg === '--har-file' || arg === '-o') {
    harFileName = args[++i];
  } else if (arg === '--skip-tls-check') {
    skipTlsVerification = true;
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

function printHelp() {
  console.log(`
SCIM Verify - A tool to verify SCIM server implementations

Usage: npx scimverify [options]

Options:
  -c, --config <path>       Path to YAML configuration file
  -b, --base-url <url>      Base URL of the SCIM server
  -a, --auth-header <auth>  Authorization header (e.g. "Bearer token")
  -o, --har-file <path>     Path to write HAR file output
  --skip-tls-check          Use when running a server with self-signed certificates
  -h, --help                Show this help message

Example:
  npx scimverify --base-url https://api.scim.dev/scim/v2 --auth-header "Bearer token123" --config ./config.yaml

Documentation: https://verify.scim.dev
  `);
}

// Main function
async function main() {
  // Check for required parameters
  if (!baseUrl) {
    console.error('Error: Base URL is required. Use --base-url or -b option.');
    printHelp();
    process.exit(1);
  }

  if (!authHeader) {
    console.error('Error: Authorization header is required. Use --auth-header or -a option.');
    printHelp();
    process.exit(1);
  }

  // Load config from file if provided
  let config = {};
  if (configPath) {
    try {
      const configFile = await fs.readFile(path.resolve(process.cwd(), configPath), 'utf8');
      config = parse(configFile);
    } catch (error) {
      console.error(`Error loading config file: ${error.message}`);
      process.exit(1);
    }
  }

  // Run tests
  try {
    const result = await runAllTests({
      baseURL: baseUrl,
      authHeader: authHeader,
      skipTlsVerification,
      ...config,
    });

    if (!result.success) {
      console.error('Tests failed!');
      process.exit(1);
    } else {
      console.log('All tests passed successfully!');
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    if (harFileName) {
      // Make sure the HAR file has the correct extension
      if (!harFileName.toLowerCase().endsWith('.har')) {
        harFileName += '.har';
      }

      console.log('Writing HAR file:', harFileName);
      writeHarFile(harFileName);
    }
    clearHarEntries();
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});