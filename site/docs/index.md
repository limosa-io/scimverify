# SCIM Verify

We all want to use or build SCIM-compliant servers. Yes, even you! But how can we ensure these servers follow the specifications correctly? That's where SCIM Verify comes in. SCIM Verify is a CLI tool that acts as a SCIM client and checks whether a SCIM server complies with the specifications and reports on what is and isn’t implemented.

::: warning Alpha Release
This is an **alpha version** of the software, and it is provided **as-is**. It <strike>may</strike> contain bugs, incomplete features, or other issues that could affect its stability and functionality. Use at your own risk. No warranties, express or implied, are provided.
:::

## How to use

Run the command as follows:

~~~
docker run --env-file .env ghcr.io/limosa-io/scimverify:latest
~~~

Make sure to create the `.env` file and populate it like this:

~~~
BASE_URL=https://api.scim.dev/scim/v2
TOKEN=5yeXzWOBW2gHEJQTFC6DMyAImscoE67854DSurSrFKzH1MdhlYNeayXAyrmi
~~~

To ensure all tests pass, it is essential to have valid `schemas` and `resourcetypes` endpoints.

## Example output

~~~
▶ SCIM Base URL Tests
  ✔ Base URL should not contain any query parameters (0.317131ms)
  ✔ Base URL should be reachable (81.89949ms)
  ✔ Authentication should be required for /Users (108.680669ms)
▶ SCIM Base URL Tests (193.867191ms)

▶ /ResourceTypes
  ✔ /ResourceTypes endpoint should be reachable (30.077569ms)
  ✔ Should return a list of resource types (23.535307ms)
  ✔ Every resource in the list should be a valid resource type (25.576388ms)
  ✔ Should be able to retrieve a single resource type (26.711921ms)
▶ /ResourceTypes (108.101363ms)

▶ /Schemas
  ✔ /Schemas endpoint should be reachable (27.007334ms)
  ✔ Should return a list of schemas (30.07646ms)
  ✔ Every schema in the list should be valid (28.499897ms)
  ✔ Should be able to retrieve a single schema (29.326103ms)
▶ /Schemas (118.574218ms)

▶ /Users
  ✔ Retrieves a list of users (127.726336ms)
  ✔ Retrieves a single user (94.479882ms)
  ✔ Handles retrieval of a non-existing user (80.158763ms)
  ✔ Paginates users using startIndex (114.088638ms)
  ✔ Sorts users by userName (126.5683ms)
  ✔ Retrieves only userName attributes (156.423275ms)
  ✔ Creates a new user (88.896496ms)
  ✔ Updates a user using PUT (84.760796ms)
  ✔ Updates a user using PATCH (91.697855ms)
  ✔ Deletes a user (88.710121ms)
▶ /Users (1056.745222ms)

▶ /Groups
  ✔ Retrieves a list of groups (111.312116ms)
  ✔ Retrieves a single group (70.259074ms)
  ✔ Handles retrieval of a non-existing group (71.175641ms)
  ✔ Creates a new group (85.34262ms)
  ✔ Returns errors when creating an invalid group (59.51766ms)
  ✔ Assigns a user to a group (276.354437ms)
▶ /Groups (676.343313ms)

ℹ tests 27
ℹ suites 5
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2321.382925
~~~

## SCIM Playground

SCIM Verify is designed to test any SCIM server, including SCIM Playground from scim.dev. You may want to use SCIM Playground for testing.
