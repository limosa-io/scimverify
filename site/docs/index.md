# SCIM Verify

We all want to use or build SCIM-compliant servers. Yes, even you! But how can we ensure these servers follow the specifications correctly? That's where SCIM Verify comes in. SCIM Verify is a CLI tool that checks whether a SCIM server complies with the specifications and reports on what is and isn’t implemented.

# How to use

First, define the SCIM base url and token.

~~~
arie@limosa.io:~/scimverify$ node --test
▶ SCIM Base URL Tests
  ✔ should not contain a query parameter (1.740516ms)
  ✔ should be reachable (122.672951ms)
  ✔ should require authentication for /Users (149.023673ms)
▶ SCIM Base URL Tests (283.846996ms)

▶ /ResourceTypes
  ✔ Test if is reachable (37.456063ms)
  ✔ Must return list of resource types (32.611469ms)
  ✔ Each returned resource should be a valid resource type (32.007543ms)
  ✔ Retrieve single resource type (29.690818ms)
▶ /ResourceTypes (138.107276ms)

▶ /Schemas
  ✔ Test if is reachable (43.823839ms)
  ✔ Must return list of schemas (38.840877ms)
  ✔ Each returned schema should be a valid schema (36.895505ms)
  ✔ Retrieve single schema (30.005834ms)
▶ /Schemas (156.943212ms)

▶ /Users
  ✔ Retrieve users (114.755848ms)
  ✔ Retrieve single user (81.389208ms)
  ✔ Retrieve non existing user (78.3491ms)
  ✔ Paginate with startIndex (107.284005ms)
  ✔ Sort users by userName (141.966214ms)
  ✔ Retrieve only userName attributes (116.027031ms)
  ✔ Create a new user (92.879558ms)
  ✔ Update user with PUT (94.785006ms)
  ✔ Update user with PATCH (98.389301ms)
  ✔ Delete user (87.32711ms)
▶ /Users (1019.652892ms)

▶ /Groups
  ✔ Retrieve groups (105.037095ms)
  ✔ Retrieve single group (68.933426ms)
  ✔ Retrieve non existing group (69.585831ms)
  ✔ Create a new group 0 (83.138231ms)
  ✔ Create a new group 1 (89.82376ms)
  ✔ Create a new group 2 (89.282136ms)
  ✔ Create a new group 3 (150.098264ms)
  ✔ Create a new group 4 (81.045849ms)
  ✔ Create an incorrect group, expect errors (68.04409ms)
  ✔ Assign user to group (292.486627ms)
▶ /Groups (1102.932908ms)

ℹ tests 31
ℹ suites 5
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3354.344344
~~~

<style scoped>
.green {
    color: green;
}
</style>