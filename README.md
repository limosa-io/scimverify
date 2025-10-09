[![CI](https://github.com/limosa-io/scimverify/actions/workflows/ci.yml/badge.svg)](https://github.com/limosa-io/scimverify/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/scimverify.svg)](https://www.npmjs.com/package/scimverify)
[![npm](https://img.shields.io/npm/dm/scimverify.svg)](https://www.npmjs.com/package/scimverify)

# SCIM Verify

![SCIM Verify](site/public/scimverify-ogimage.png)

This tool is created to check the SCIM (System for Cross-domain Identity Management) conformance of your SCIM server.

You can use SCIM Verify online at [https://verify.scim.dev/](https://verify.scim.dev/) or run it locally. A SCIM test server is available at [SCIM Playground](https://scim.dev).

## Usage

You can use SCIM Verify directly with npx without installing it globally:

```bash
npx scimverify --base-url https://api.scim.dev/scim/v2 --auth-header "Bearer YOUR_TOKEN" --config ./config.yaml
```

Options:
- `-b, --base-url <url>` - Base URL of the SCIM server (required)
- `-a, --auth-header <auth>` - Authorization header (required)
- `-c, --config <path>` - Path to YAML configuration file (optional)
- `-o, --har-file <path>` - Path to write HAR file output (optional)
- `--skip-tls-verification` - Use when running a server with self-signed certificates (optional)
- `-h, --help` - Show help message

## Features

- Validate SCIM endpoints
- Check compliance with SCIM specifications
- Generate detailed reports on conformance

## Licensing

This tool is available under GPLv3.

Note that other licensing options are available.

## Commercial Support

For organizations requiring additional assistance, commercial support options are available. Please contact scim@a11n.nl for more details.

## Resources

- [SCIM Playground](https://scim.dev) — Try SCIM APIs interactively

## Contact

For more information, please visit [verify.scim.dev](https://verify.scim.dev/) or contact us at scim@a11n.nl.
