# Docker

SCIM Verify is available as a Docker container, making it easy to run locally, in CI/CD pipelines, or in any environment that supports Docker. This approach eliminates the need for connecting your test environments to the internet.

The Docker image is hosted on GitHub Container Registry and can be pulled using the command below.

Before running the command below, make sure you have a local `config.yaml` file and a proper `output` directory. Adjust the mount points accordingly, if necessary.

## Environment variables

| Variable                | Required | Description                                                             |
| ----------------------- | :------: | ----------------------------------------------------------------------- |
| `AUTH_HEADER`           |   Yes    | Authorization header                                                    |
| `BASE_URL`              |   Yes    | Base URL of the SCIM server`                                            |
| `CONFIG_FILE`           |    No    | Path to YAML configuration file                                         |
| `CONFIG`                |   No\*   | YAML configuration                                                      |
| `HAR_FILE_NAME`         |    No    | Path to write HAR file output                                           |
| `SKIP_TLS_VERIFICATION` |    No    | Set non-empty value when running a server with self-signed certificates |

\* `CONFIG` is required when `CONFIG_FILE` is not set

## Example command

```sh
docker run \
    -e CONFIG_FILE=/app/config.yaml \
    -e AUTH_HEADER="Bearer REPLACE_THIS" \
    -e BASE_URL="https://api.scim.dev/scim/v2" \
    -e HAR_FILE_NAME="/output/output.har" \
    -v $(pwd)/site/.vitepress/theme/components/config.yaml:/app/config.yaml \
    -v $(pwd)/output/:/output \
    ghcr.io/limosa-io/scimverify
```

## Example configuration

```yaml
detectSchema: true
detectResourceTypes: true

users:
  enabled: true
  operations:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
  sortAttributes:
    - userName

  filter_tests:
    - filter: userName eq "bjensen"
      user_schema:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:User" },
                },
              "urn:ietf:params:scim:schemas:core:2.0:User":
                {
                  "type": "object",
                  "properties":
                    { "userName": { "type": "string", "const": "bjensen" } },
                  "required": ["userName"],
                  "additionalProperties": true,
                },
            },
          "required": ["schemas", "urn:ietf:params:scim:schemas:core:2.0:User"],
          "additionalProperties": true,
        }

  post_tests:
    - request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
          "userName": "barbara jensen",
          "emails": [{ "value": "barbara.jensen@example.com" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:User" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:User":
                {
                  "type": "object",
                  "properties":
                    {
                      "userName":
                        { "type": "string", "const": "barbara jensen" },
                      "emails":
                        {
                          "type": "array",
                          "items":
                            {
                              "type": "object",
                              "properties":
                                {
                                  "value":
                                    {
                                      "type": "string",
                                      "const": "barbara.jensen@example.com",
                                    },
                                },
                            },
                        },
                    },
                  "required": ["userName"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:User"],
          "additionalProperties": true,
        }
    - request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
          "userName": "bjensen",
          "emails": [{ "value": "barbara.jensen@example.com" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:User" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:User":
                {
                  "type": "object",
                  "properties":
                    {
                      "userName": { "type": "string", "const": "bjensen" },
                      "emails":
                        {
                          "type": "array",
                          "items":
                            {
                              "type": "object",
                              "properties":
                                {
                                  "value":
                                    {
                                      "type": "string",
                                      "const": "barbara.jensen@example.com",
                                    },
                                },
                            },
                        },
                    },
                  "required": ["userName", "emails"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:User"],
          "additionalProperties": true,
        }

  put_tests:
    - id: AUTO
      request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
          "userName": "bdoe",
          "emails": [{ "value": "barbara.jensen@example.com" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:User" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:User":
                {
                  "type": "object",
                  "properties":
                    {
                      "userName": { "type": "string", "const": "bdoe" },
                      "emails":
                        {
                          "type": "array",
                          "items":
                            {
                              "type": "object",
                              "properties":
                                {
                                  "value":
                                    {
                                      "type": "string",
                                      "const": "barbara.jensen@example.com",
                                    },
                                },
                            },
                        },
                    },
                  "required": ["userName"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:User"],
          "additionalProperties": true,
        }

  patch_tests:
    - id: AUTO
      request:
        {
          "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          "Operations":
            [{ "op": "replace", "path": "userName", "value": "JohnDoe" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:User" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:User":
                {
                  "type": "object",
                  "properties":
                    { "userName": { "type": "string", "const": "JohnDoe" } },
                  "required": ["userName"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:User"],
          "additionalProperties": true,
        }
  delete_tests:
    - id: AUTO

groups:
  enabled: true
  operations:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
  sortAttributes:
    - displayName

  post_tests:
    - request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
          "displayName": "TestGroup",
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:Group" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:Group":
                {
                  "type": "object",
                  "properties":
                    {
                      "displayName": { "type": "string", "const": "TestGroup" },
                    },
                  "required": ["displayName"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:Group"],
          "additionalProperties": true,
        }
    - request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
          "displayName": "Engineering",
          "members": [{ "value": "AUTO" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:Group" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:Group":
                {
                  "type": "object",
                  "properties":
                    {
                      "displayName":
                        { "type": "string", "const": "Engineering" },
                      "members":
                        {
                          "type": "array",
                          "items":
                            {
                              "type": "object",
                              "properties": { "value": { "type": "string" } },
                            },
                        },
                    },
                  "required": ["displayName", "members"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:Group"],
          "additionalProperties": true,
        }

  put_tests:
    - id: AUTO
      request:
        {
          "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
          "displayName": "UpdatedGroup",
          "members": [{ "value": "AUTO" }],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:Group" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:Group":
                {
                  "type": "object",
                  "properties":
                    {
                      "displayName":
                        { "type": "string", "const": "UpdatedGroup" },
                      "members":
                        {
                          "type": "array",
                          "items":
                            {
                              "type": "object",
                              "properties": { "value": { "type": "string" } },
                            },
                        },
                    },
                  "required": ["displayName", "members"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["urn:ietf:params:scim:schemas:core:2.0:Group", "schemas"],
          "additionalProperties": true,
        }

  patch_tests:
    - id: AUTO
      request:
        {
          "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          "Operations":
            [
              {
                "op": "replace",
                "path": "displayName",
                "value": "NewGroupName",
              },
            ],
        }
      response:
        {
          "type": "object",
          "properties":
            {
              "schemas":
                {
                  "type": "array",
                  "items": { "type": "string" },
                  "contains":
                    { "const": "urn:ietf:params:scim:schemas:core:2.0:Group" },
                },
              "id": { "type": "string" },
              "meta": { "type": "object" },
              "urn:ietf:params:scim:schemas:core:2.0:Group":
                {
                  "type": "object",
                  "properties":
                    {
                      "displayName":
                        { "type": "string", "const": "NewGroupName" },
                    },
                  "required": ["displayName"],
                  "additionalProperties": true,
                },
            },
          "required":
            ["schemas", "id", "urn:ietf:params:scim:schemas:core:2.0:Group"],
          "additionalProperties": true,
        }
  delete_tests:
    - id: AUTO
```
