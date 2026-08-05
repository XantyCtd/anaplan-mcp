# Anaplan SCIM API

## Introduction

The Anaplan SCIM Service API is the Anaplan implementation of the [System for Cross-domain Identity Management](https://scim.cloud/) (SCIM) standard. SCIM is an HTTP-based protocol that makes managing identities in multi-domain scenarios easier through a standardized service. With Anaplan's SCIM Service APIs, you can:

- Build integrations with supported identity management tools
- Automate the management of your user identity records

Anaplan's SCIM API provides standardized accessibility and full operability with identity management systems, solving identity maintenance challenges such as record tracking and on/off-boarding. This API is separate from Anaplan's user interface.

Anaplan's implementation uses version 2.0 of the SCIM standard.

**Notes:**

- SCIM does not support [Visiting users](https://help.anaplan.com/f87e1b1f-ab9c-4861-bf98-07cb0ad7e367-Visiting-users).
- When you assign a workspace to SSO, all users become SSO users by default. Once SSO is set up, exception users can log in using SSO or the standard login mechanism at the [Anaplan URL](https://sdp.anaplan.com/frontdoor/login). See [Assign Exception Users](https://help.anaplan.com/7ee21650-a87c-4155-8aed-f57eaba27989-Assign-Exception-Users) for more information.

## Getting Started

### URL, IP, and allowlist requirements

To set your allowlists for API calls, see [URL, IP, and allowlist requirements](https://support.anaplan.com/url-ip-and-allowlist-requirements-c8235c7d-8af2-413b-a9ff-d465978806b9).

### Test steps

We recommend you test your SCIM setup. Any test users you create are at the tenant (production) level and will have full-model access. Disable your test users when tests are complete.

1. Set up test workspace.
2. Set up test model within your test workspace.
3. Create a test non-SSO user account to call the SCIM API and assign a USER_ADMIN role.
4. Call the SCIM API from your non-prod environment and create test users. These users are at the tenant level and will be visible in the Anaplan production environment.
5. When satisfied with your integration, create a production non-SSO user account to call the SCIM API and assign the USER_ADMIN role.
6. To remove any test data created in Anaplan, disable the test users.

At this point, you can enable your production integration with the Anaplan SCIM API.

### System of Record

When using SCIM APIs you should decide which system of record you will use for User attributes and/or Entitlement (e.g. Workspace) associations. Data synchronized is stored within Anaplan and can also be updated in the Anaplan Administration UI.

For example, you may choose to synchronize a user's `familyName`, `givenName` and `userName` (email login) but not synchronize `activeFlag` and entitlements (workspace associations). Alternatively, you may choose to store and synchronize all of that data in your internal systems.

Be aware that changes in the Anaplan UI will change the data stored in Anaplan. Depending on how you integrate with the SCIM APIs, you may create an unexpected condition. For example, if someone gets married and you change the `familyName` (Last Name) in the Anaplan Administration UI but not your system-of-record, depending on how your integration logic is written, that change could be set back to the original `familyName`.

### API endpoints

- [Get single user and workspace details](#get-a-single-user-and-workspace-details)
- [Get multiple users](#get-multiple-users)
- [Add a user and their workspaces](#add-a-user-and-their-workspaces)
- [Replace user](#replace-user-details)
- [Edit user details](#edit-user-details)
- [Get supported SCIM capabilities](#get-supported-scim-capabilities)
- [Get resource types](#get-resource-types)
- [Get resource schema](#get-resource-schema)

### Other topics

- [Authentication](#authentication)
- [Error Codes](#scim-error-codes)
- [Vendor Integration](#identity-provider-integration)
- [SCIM Exceptions](#differences-to-the-scim-standard)

## Authentication

You can authenticate with basic authentication, an Anaplan token, or with API keys.

**Note:** An active Anaplan, non-SSO user with the User Admin role is recommended to call the SCIM API.

### Basic auth method

Call Anaplan SCIM API using basic auth in an Authorization HTTP Header.

**Request header:**

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` | The standard basic auth header |

**Request parameters:** none

**Curl example:**

```bash
curl -X POST \
  -H 'Authorization: BASIC <username:password base64 encoded>' \
  https://api.anaplan.com/scim/1/0/v2/Users/<user id here>
```

**Note:** `Users` is case sensitive. Use a capital U.

**Response body:** If your authentication passes, you will receive the response for the API you called.

### Anaplan token authentication method

The Anaplan token authentication method uses a bearer token and has a two step process.

**Step 1 - Generate the token**

You can generate the token in two ways:

- [With a username and password](https://help.anaplan.com/3a4a2905-3d55-4199-a980-d1a89ffdcb7e-Use-basic-authentication)
- [With a pre-registered certificate](https://help.anaplan.com/1493b16d-7294-47d6-bd8d-056962e9b8da-Use-CA-certificate-authentication)

Both methods return the token you need to use when you call the SCIM endpoints.

**Step 2 - Pass the token to the SCIM API**

```http
POST https://api.anaplan.com/scim/1/0/v2/Users/<user id here>
Authorization: AnaplanAuthToken <id token from step 1>
```

**Request header:**

| Header | Details |
|--------|---------|
| `Authorization: AnaplanAuthToken <id token from step 1>` | Place the word `AnaplanAuthToken` followed by a space and then the ID Token. |

**Request parameters:** none

**Curl example:**

```bash
curl -X POST \
  -H 'Authorization: AnaplanAuthToken <id token here>' \
  https://api.anaplan.com/scim/1/0/v2/Users/<user id here>
```

**Response body:** If your authentication passes, you'll receive the response for the API you called.

### API keys method

The Anaplan API keys method uses a bearer token and has a two step process.

**Step 1 - Generate the key**

See [Anapedia API keys](https://help.anaplan.com/c853f749-8766-4cc0-84a5-a6897dd4d1cb).

**Step 2 - Pass the token to the SCIM API**

```http
POST https://api.anaplan.com/scim/1/0/v2/Users/<user id here>
Authorization: Bearer <API key>
```

**Request header:**

| Header | Details |
|--------|---------|
| `Authorization: Bearer <API key from step 1>` | Place the word `Bearer` followed by a space and then the API key. |

**Request parameters:** none

**Curl example:**

```bash
curl -X POST \
  -H 'Authorization: Bearer <API key>' \
  https://api.anaplan.com/scim/1/0/v2/Users/<user id here>
```

**Response body:** If your authentication passes, you'll receive the response for the API you called.

## Get a single user and workspace details

Use this endpoint to retrieve all user information and associated workspaces. In this example, Barbara Jensen is associated with two workspaces, Finance and Sales.

### Request

```http
GET /Users/{id}
Host: https://api.anaplan.com/scim/1/0/v2
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Accept: application/json
```

### Request headers

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` OR `Authorization: AnaplanAuthToken` OR `Authorization: Bearer` | Required. Basic auth, Anaplan bearer token, or OAuth Access token/API Key. |
| `Accept: application/scim+json` | Optional (defaults to `application/json`). This call responds with a content type of `application/scim+json`. |

### Curl example

```bash
curl -X GET \
  -H 'Authorization: BASIC <username:password base64 encoded>' \
  https://api.anaplan.com/scim/1/0/v2/Users/{id}
```

### Response header

| Header | Details |
|--------|---------|
| `Content-Type: application/json` | The response body is formatted as `application/json`. |
| `Location` | The resource URL. Example: `https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646` |

### Response body (single user)

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "bjensen",
  "active": true,
  "userName": "bjensen@example.com",
  "meta": {
    "resourceType": "User",
    "created": "2019-08-01T18:29:49.793Z",
    "lastModified": "2019-08-01T18:29:49.793Z",
    "location": "https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646"
  },
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "entitlements": [
    {
      "value": "6edb50156273d29050001",
      "display": "Finance Workspace",
      "type": "WORKSPACE"
    },
    {
      "value": "6edb50156273d29050002",
      "display": "Sales Workspace",
      "type": "WORKSPACE"
    }
  ]
}
```

### Differences to the SCIM Standard

- Unsupported: include/exclude query parameters

## Get multiple users

Use this endpoint to search for users and associated workspaces. The limit is 100 users per call.

### Request

Use a filter and provide the pagination parameters `startIndex` and `count` to retrieve multiple users.

```http
GET /Users?filter=name.givenName Eq "John"&startIndex=1&count=100
Host: https://api.anaplan.com/scim/1/0/v2
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Accept: application/json
```

### Request headers

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` OR `Authorization: AnaplanAuthToken` OR `Authorization: Bearer` | Required. Basic auth, Anaplan authentication token, or OAuth Access token/API Key. |
| `Accept: application/scim+json` | Optional (defaults to `application/json`). This call responds with a content type of `application/scim+json`. |

### Request parameters

#### Pagination parameters

| Parameter | Details |
|-----------|---------|
| `startIndex` | The pagination index to start with for the response. Default: 1 |
| `count` | The pagination count per response. Default: 50 |

#### Filter parameters

| Parameter | Details |
|-----------|---------|
| `filter` | A filter expression to restrict the result set in the form of `<field> <operator> <value>`. Example: `givenName Eq "John"`. Expressions may be separated with `and`, `or`, or `( )` (`not` is not supported). |

#### Filter fields

| Field | Details |
|-------|---------|
| `id` | Supported |
| `externalId` | Supported |
| `userName` | Supported |
| `name.familyName` | Supported |
| `name.givenName` | Supported |
| `active` | Supported |
| `name.formatted` | Not Supported |
| `displayName` | Not Supported |
| `entitlements.display` | Not Supported |
| `entitlements.primary` | Not Supported |
| `entitlements.type` | Not Supported |
| `entitlements.value` | Not Supported |

#### Filter operators

Any case for the operator is honored (e.g., `Eq` or `eq` both work). Not all filter operators are supported.

| Operator | Details |
|----------|---------|
| `Eq` | Equal. The attribute and operator values must be identical for a match. Supported: yes |
| `Ne` | Not equal. The attribute and operator values are not identical. Supported: yes |
| `Co` | Contains. The entire operator value must be a substring of the attribute value for a match. Supported: no |
| `Sw` | Starts with. The entire operator value must be at the beginning of the attribute value. This criterion is satisfied if the two strings are identical. Supported: no |
| `Ew` | Ends with. The entire operator value must be a substring of the attribute value, matching at the end. This criterion is satisfied if the two strings are identical. Supported: no |
| `Pr` | Present. If the attribute has a non-empty or non-null value, or if it contains a non-empty node for complex attributes, there is a match. Supported: yes |
| `Gt` | Greater than. If the attribute value is greater than the operator value, there is a match. Comparison depends on attribute type (lexicographical for strings, chronological for DateTime, numeric for integers). Supported: yes |
| `Ge` | Greater than or equal to. Same comparison rules as `Gt`. Supported: yes |
| `Lt` | Less than. If the attribute value is less than the operator value, there is a match. Same comparison rules as `Gt`. Supported: yes |
| `Le` | Less than or equal to. Same comparison rules as `Gt`. Supported: yes |

#### Complex attributes

Complex attribute filtering (e.g., searching in a complex array with the `[]` notation) is not supported.

### Curl example

```bash
curl -X GET \
  -H 'Authorization: BASIC <username:password base64 encoded>' \
  'https://api.anaplan.com/scim/1/0/v2/Users?filter=givenName Eq "John"&startIndex=1&count=100'
```

### Response header

| Header | Details |
|--------|---------|
| `Content-Type: application/json` | The response body is formatted as `application/scim+json`. |
| `Location` | The resource URL. Example: `https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646` |

### Response body

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
```

```json
{
  "totalResults": 1,
  "startIndex": 1,
  "itemsPerPage": 1,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
      "meta": {
        "resourceType": "User",
        "created": "2018-04-24T23:43:48.000+00:00",
        "lastModified": "2019-01-15T22:04:19.000+00:00",
        "location": "https://localhost:8090/1/0/v2/Users/8a80db9362f64cad0162fa0ab3fe0001"
      },
      "id": "8a80db9362f64cad0162fa0ab3fe0001",
      "externalId": "",
      "active": true,
      "userName": "sfqasuper@anaplan.com",
      "name": {
        "familyName": "Super",
        "givenName": "SFQA",
        "formatted": "SFQA Super"
      },
      "displayName": "SFQA Super",
      "entitlements": [
        {
          "display": "Finance Workspace",
          "value": "6edb50156273d29050001",
          "type": "WORKSPACE"
        },
        {
          "display": "Sales Workspace",
          "value": "6edb50156273d29050002",
          "type": "WORKSPACE"
        },
        {
          "value": "6edb50156273d29050001,6edb50156273d29050002",
          "type": "WORKSPACE_IDS"
        }
      ]
    }
  ]
}
```

### Differences to the SCIM Standard

- Unsupported: include/exclude query parameters
- Supported: some filter query parameters
  - Unsupported: some filter operations. See the table above.
  - Unsupported: some filter fields. See the table above.
  - Unsupported: caseExact search on `id` and `externalId`. Search is case-insensitive.
- Unsupported: Search with POST (`/.search` and `/User/.search`)

## Add a user and their workspaces

Use this call to add a user, their name details, and their workspace entitlements. There is a limit of 50 workspaces per call.

### Workspaces

Workspace assignment is the primary entitlement needed at Anaplan. Each tenant has many workspaces and each workspace has many models. Customers often organize workspaces by department, e.g. Finance Workspace, Sales Workspace.

SCIM supports workspace assignment using the Entitlement object, which is a complex attribute inside the User object.

**Note:** The `display` field is ignored; only the `value` field with the Workspace GUID is currently supported.

Workspace GUIDs for a tenant can be found via the [Anaplan Bulk API](https://anaplanbulkapi20.docs.apiary.io/#ListUserWorkspaces).

### Request headers

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` OR `Authorization: AnaplanAuthToken` | Required. Basic auth or Anaplan bearer token. |
| `Accept: application/scim+json` | Optional (defaults to `application/json`). This call responds with a content type of `application/scim+json`. |

### Request

```http
POST /Users
Host: https://api.anaplan.com/scim/1/0/v2
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Accept: application/scim+json
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "bjensen@company.com",
  "externalId": "bjensen",
  "active": "True",
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "value": "6edb50156273d29050001",
      "display": "Finance Workspace",
      "type": "WORKSPACE"
    },
    {
      "value": "6edb50156273d29050002",
      "display": "Sales Workspace",
      "type": "WORKSPACE"
    }
  ]
}
```

### User attributes

| Parameter | Details |
|-----------|---------|
| `id` | The Anaplan unique ID for the resourceType. |
| `userName` | The email login. Example: `peter.smith@example.com` |
| `externalId` | Your unique ID for this user (as stored in your company systems). Example: `Barbara Jensen` |
| `name.formatted` | The formatted name (informational only; not stored or searchable). Example: `b.jensen` |
| `name.givenName` | The first name. |
| `name.familyName` | The last or family name. |
| `displayName` | The display name (informational only; not stored or searchable). Example: `b.jensen` |

### Entitlements

An entitlement allows the User to access a Workspace. Workspace is the only entitlement supported. Either the ID of the workspace or its name is required.

Three types are supported:

- **WORKSPACE** - the ID of the workspace in an array of entitlement records
- **WORKSPACE_IDS** - a comma-separated list of workspace IDs in a single entitlement record
- **WORKSPACE_NAMES** - a comma-separated list of workspace names in a single entitlement record

#### WORKSPACE

The preferred way to manage workspaces a user has access to.

Uses an array of complex objects, each one with type `WORKSPACE`. Either `value` (workspace ID) or `display` (workspace name) can be used.

It is always returned if the user has access to workspaces, even if the type is not included in the request.

| Parameter | Details |
|-----------|---------|
| `type` | Indicates the type of Entitlement (`WORKSPACE` for this type). |
| `value` | The ID of the resource (workspace). Example: `6edb50156273d29050001` |
| `display` | The name of the workspace. Example: `Finance Workspace` |
| `primary` | The SCIM specification requires a primary attribute on arrays. At Anaplan there is no concept of primary entitlement. You will see it on the first item in the array; it is not stored and has no meaning. Example: `True` |

**Example request:**

```http
POST /Users
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/scim+json
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "bjensen@company.com",
  "externalId": "bjensen",
  "active": "True",
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "value": "6edb50156273d29050001",
      "display": "Finance Workspace",
      "type": "WORKSPACE"
    },
    {
      "value": "6edb50156273d29050002",
      "display": "Sales Workspace",
      "type": "WORKSPACE"
    }
  ]
}
```

#### WORKSPACE_IDS

Provided for integrations that don't support arrays of complex objects.

Uses a single entry with a comma-delimited list of workspace IDs.

It is always returned if the user has access to workspaces, even if the type is not included in the request.

| Parameter | Details |
|-----------|---------|
| `type` | Indicates the type of Entitlement (`WORKSPACE_IDS` for this type). |
| `value` | For `WORKSPACE_IDS`, a comma-delimited list of workspace GUIDs. Example: `6edb50156273d29050001, 22222` |

**Example request:**

```http
POST /Users
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/scim+json
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "bjensen@company.com",
  "externalId": "bjensen",
  "active": "True",
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "value": "6edb50156273d29050001,67890",
      "type": "WORKSPACE_IDS"
    }
  ]
}
```

#### WORKSPACE_NAMES

Provided for integrations that don't support arrays of complex objects.

Uses a single entry with a comma-delimited list of workspace names.

It is always returned if the user has access to workspaces, even if the type was not included in the request.

| Parameter | Details |
|-----------|---------|
| `type` | Indicates the type of Entitlement (`WORKSPACE_NAMES` for this type). |
| `value` | For `WORKSPACE_NAMES`, a comma-delimited list of workspace names. Each workspace name needs to be inside escaped double quotes. Example: `\"Finance\", \"Marketing\"` |

**Example request:**

```http
POST /Users
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/scim+json
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "bjensen@company.com",
  "externalId": "bjensen",
  "active": "True",
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "value": "\"Finance\",\"Sales\"",
      "type": "WORKSPACE_NAMES"
    }
  ]
}
```

### Response body

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "bjensen",
  "active": "True",
  "meta": {
    "resourceType": "User",
    "created": "2011-08-01T21:32:44.882Z",
    "lastModified": "2011-08-01T21:32:44.882Z",
    "location": "https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646",
    "version": "W/\"e180ee84f0671b1\""
  },
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "userName": "bjensen",
  "entitlements": [
    {
      "display": "Finance Workspace",
      "value": "6edb50156273d29050001",
      "type": "WORKSPACE",
      "primary": true
    },
    {
      "value": "6edb50156273d29050001",
      "type": "WORKSPACE_IDS"
    },
    {
      "value": "Finance Workspace",
      "type": "WORKSPACE_NAMES"
    }
  ]
}
```

### Differences to the SCIM Standard

- Unsupported: include/exclude query parameters

## Replace user details

Use this API request to replace user details, such as removing workspace entitlements. If you don't enter an entitlement, the user is removed from any associated workspaces. (Example: Here we remove Barbara Jensen from the Sales workspace.)

### Request

```http
PUT /Users/2819c223-7f76-453a-919d-413861904646
Host: https://api.anaplan.com/scim/1/0/v2
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Accept: application/scim+json
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "userName": "bjensen@company.com",
  "externalId": "bjensen",
  "active": "True",
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "display": "Finance Workspace",
      "value": "6edb50156273d29050001",
      "type": "WORKSPACE"
    }
  ]
}
```

### Request headers

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` OR `Authorization: AnaplanAuthToken` | Required. Basic auth or Anaplan bearer token. |
| `Accept: application/scim+json` | Optional (defaults to `application/json`). This call responds with a content type of `application/scim+json`. |
| `Content-Type: application/scim+json` | Required. Specifies the media type that identifies JSON structured data conforming to the SCIM protocol and schema specifications. |

### User attributes

| Parameter | Details |
|-----------|---------|
| `id` | The Anaplan unique ID for the resourceType. |
| `userName` | The email login. Example: `peter.smith@example.com` |
| `externalId` | Your unique ID for this user (as stored in your company systems). Example: `Barbara Jensen` |
| `name.formatted` | The formatted name (informational only; not stored or searchable). Example: `b.jensen` |
| `name.givenName` | The first name. |
| `name.familyName` | The last or family name. |
| `displayName` | The display name (informational only; not stored or searchable). Example: `b.jensen` |

### Entitlements

An entitlement allows the User to access a Workspace. Workspace is the only entitlement supported.

Three types are supported:

- **WORKSPACE** - the ID of the workspace in an array of entitlement records
- **WORKSPACE_IDS** - a comma-separated list of workspace IDs in a single entitlement record
- **WORKSPACE_NAMES** - a comma-separated list of workspace names in a single entitlement record

| Parameter | Details |
|-----------|---------|
| `type` | Indicates the type of Entitlement. Example: `WORKSPACE`, `WORKSPACE_IDS` |
| `value` | For `WORKSPACE`, the ID of the resource (workspace). Example: `6edb50156273d29050001`. For `WORKSPACE_IDS`, a comma-delimited list of workspace GUIDs. Example: `6edb50156273d29050001, 22222` |
| `display` | The workspace name (informational only; not stored or searchable). Example: `Finance Workspace` |
| `primary` | The SCIM specification requires a primary attribute on arrays. At Anaplan there is no concept of primary entitlement. You will see it on the first item in the array; it is not stored and has no meaning. Example: `True` |

**Example: type=WORKSPACE**

The `display` field is ignored.

```json
"entitlements": [
  {
    "value": "6edb50156273d29050001",
    "display": "Finance Workspace",
    "type": "WORKSPACE",
    "primary": true
  }
]
```

**Example: type=WORKSPACE_IDS**

The `display` field is ignored.

```json
"entitlements": [
  {
    "value": "6edb50156273d29050001",
    "type": "WORKSPACE_IDS"
  }
]
```

**Example: type=WORKSPACE_NAMES**

The `display` field is ignored.

```json
"entitlements": [
  {
    "display": "Finance Workspace",
    "type": "WORKSPACE_NAMES"
  }
]
```

### Response body

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "bjensen",
  "active": "True",
  "meta": {
    "resourceType": "User",
    "created": "2011-08-01T21:32:44.882Z",
    "lastModified": "2011-08-01T21:32:44.882Z",
    "location": "https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646"
  },
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen",
  "entitlements": [
    {
      "display": "Finance Workspace",
      "value": "6edb50156273d29050001",
      "type": "WORKSPACE",
      "primary": true
    },
    {
      "value": "6edb50156273d29050001",
      "type": "WORKSPACE_IDS"
    },
    {
      "value": "Finance Workspace",
      "type": "WORKSPACE_NAMES"
    }
  ]
}
```

### Differences to the SCIM Standard

- Unsupported: include/exclude query parameters

## Edit user details

Use this API request to edit user details. SCIM provides a rich patch specification based upon JSON Patch.

### Request

```http
PATCH /Users/{id}
Host: api.anaplan.com
Accept: application/scim+json
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Content-Type: application/scim+json
```

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "name.familyName",
      "value": "User300"
    }
  ]
}
```

### Request headers

| Header | Details |
|--------|---------|
| `Authorization: BASIC <username:password base64 encoded>` OR `Authorization: AnaplanAuthToken` | Required. Basic auth or Anaplan bearer token. |
| `Accept: application/scim+json` | Optional (defaults to `application/json`). This call responds with a content type of `application/scim+json`. |
| `Content-Type: application/scim+json` | Required. Specifies the media type that identifies JSON structured data conforming to the SCIM protocol and schema specifications. |

### Operations

Each operation indicates how to act on the attribute. The operations are processed in the order received.

| Parameter | Details |
|-----------|---------|
| `add` | Add the attribute value. |
| `replace` | Replace the attribute value. |
| `remove` | Remove the attribute value. |

### Path

The path indicates the attribute which is the target of the operation. In the SCIM specification, Path is defined as required for `remove` and optional for `add` and `replace` operations. In the Anaplan implementation, Path is always required.

| Parameter | Details |
|-----------|---------|
| `attribute` | The attribute to apply the operation to. Example: `externalId` |
| `attributePath[filter].subattribute` (where filter is `[attribute op value]`) | The path signifies the target attribute to apply the operation to. Example: `name.givenName` |

The operations have the same behavior when processing the path. The attribute or `attribute[filter]` indicates target data to add, replace, or remove. It always has the effect of representing the data that you want to remove. After removing the target data, for `add` and `replace`, the data you provide in the value is added to the record.

### Examples

**Add an entitlement:**

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "add",
      "path": "entitlements",
      "value": [
        {
          "value": "2819c223-7f76-453a-919d-413861904646",
          "type": "WORKSPACE"
        }
      ]
    }
  ]
}
```

**Replace all entitlements of type WORKSPACE with a single workspace:**

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "entitlements[type eq \"WORKSPACE\"]",
      "value": [
        {
          "value": "2819c223-7f76-453a-919d-413861904646",
          "type": "WORKSPACE"
        }
      ]
    }
  ]
}
```

**Remove all entitlements of type WORKSPACE:**

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "remove",
      "path": "entitlements[type eq \"WORKSPACE\"]"
    }
  ]
}
```

### Response body

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "bjensen",
  "active": "True",
  "meta": {
    "resourceType": "User",
    "created": "2011-08-01T21:32:44.882Z",
    "lastModified": "2011-08-01T21:32:44.882Z",
    "location": "https://api.anaplan.com/scim/1/0/v2/Users/2819c223-7f76-453a-919d-413861904646"
  },
  "name": {
    "formatted": "Barbara Jensen",
    "familyName": "Jensen",
    "givenName": "Barbara"
  },
  "displayName": "Barbara Jensen"
}
```

## Get supported SCIM capabilities

Use this call to retrieve the supported SCIM capabilities.

### Request

```http
GET /ServiceProviderConfig
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/json
```

### Request headers

| Header | Details |
|--------|---------|
| `Accept: application/json` | Optional (defaults to `application/json`). This call responds with a content type of `application/json`. |

### Request parameters

None.

### Curl example

```bash
curl -X GET https://api.anaplan.com/scim/1/0/v2/ServiceProviderConfig
```

### Response header

| Header | Details |
|--------|---------|
| `Content-Type: application/json` | The response body is formatted as `application/scim+json`. |

### Response body

In this example, values are set to false. For the current settings see: [https://api.anaplan.com/scim/1/0/v2/ServiceProviderConfig](https://api.anaplan.com/scim/1/0/v2/ServiceProviderConfig)

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/ServiceProviderConfig
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
  "documentationUrl": "https://scimapi.docs.apiary.io/",
  "patch": {
    "supported": false
  },
  "bulk": {
    "supported": false,
    "maxOperations": 1000,
    "maxPayloadSize": 1048576
  },
  "filter": {
    "supported": false,
    "maxResults": 200
  },
  "changePassword": {
    "supported": false
  },
  "sort": {
    "supported": false
  },
  "authenticationSchemes": [
    {
      "name": "HTTP Basic",
      "description": "Authentication scheme using the HTTP Basic Standard",
      "specUrl": "anaplan.docs.apiary.io",
      "documentationUrl": "https://help.anaplan.com/3a4a2905-3d55-4199-a980-d1a89ffdcb7e-Use-basic-authentication",
      "type": "httpbasic",
      "primary": false
    },
    {
      "name": "Anaplan Bearer Token",
      "description": "Authentication scheme used across Anaplan public APIs. The Basic Auth request produces a Bearer token accepted by Anaplan APIs",
      "specUrl": "https://anaplanauthentication.docs.apiary.io/#reference/authentication-token",
      "documentationUrl": "https://anaplanauthentication.docs.apiary.io/#reference/authentication-token",
      "type": "anaplanbearertoken",
      "primary": false
    }
  ],
  "meta": {
    "location": "https://api.anaplan.com/scim/1/0/v2/ServiceProviderConfig",
    "resourceType": "ServiceProviderConfig",
    "created": "2021-07-31T00:00:00Z",
    "lastModified": "2021-07-31T00:00:00Z"
  }
}
```

## Get resource types

Use this call to retrieve all of the resource types supported.

### Request

```http
GET /ResourceTypes
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/json
```

### Request headers

| Header | Details |
|--------|---------|
| `Accept: application/json` | Optional (defaults to `application/json`). This call responds with a content type of `application/json`. |

### Request parameters

None.

### Curl example

```bash
curl -X GET https://api.anaplan.com/scim/1/0/v2/ResourceTypes
```

### Response header

| Header | Details |
|--------|---------|
| `Content-Type: application/json` | The response body is formatted as `application/scim+json`. |

### Response body

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 1,
  "startIndex": 1,
  "itemsPerPage": 50,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
      "meta": {
        "resourceType": "ResourceType",
        "location": "https://api.anaplan.com/scim/1/0/v2/ResourceTypes/User"
      },
      "id": "User",
      "name": "User",
      "endpoint": "/Users",
      "description": "User Account",
      "schema": "urn:ietf:params:scim:schemas:core:2.0:User"
    }
  ]
}
```

## Get resource schema

Use this call to obtain the supported attributes for resources (e.g., User) and the attribute meta-data.

### Request

```http
GET /Schemas
Host: https://api.anaplan.com/scim/1/0/v2
Accept: application/json
```

### Request headers

| Header | Details |
|--------|---------|
| `Accept: application/json` | Optional (defaults to `application/json`). This call responds with a content type of `application/json`. |

### Curl example

```bash
curl -X GET https://api.anaplan.com/scim/1/0/v2/Schemas
```

### Request parameters

None.

### Response header

| Header | Details |
|--------|---------|
| `Content-Type: application/json` | The response body is formatted as `application/scim+json`. |

### Response body

Below is an example to illustrate format. Use the actual API to determine the Attribute Meta Data used by the API. See: [https://api.anaplan.com/scim/1/0/v2/Schemas](https://api.anaplan.com/scim/1/0/v2/Schemas)

```http
HTTP/1.1 200 OK
Content-Type: application/scim+json
Location: https://api.anaplan.com/scim/1/0/v2/Schemas
```

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 1,
  "startIndex": 1,
  "itemsPerPage": 50,
  "Resources": [
    {
      "meta": {
        "resourceType": "Schema",
        "location": "/1/0/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User"
      },
      "id": "urn:ietf:params:scim:schemas:core:2.0:User",
      "name": "User",
      "description": "User Account",
      "attributes": [
        {
          "name": "id",
          "type": "string",
          "multiValued": false,
          "description": "Unique identifier for a user by Service Provider. Note - CaseExact=false which is not per RFC.",
          "required": true,
          "caseExact": false,
          "mutability": "readOnly",
          "returned": "always",
          "uniqueness": "server"
        },
        {
          "name": "externalId",
          "type": "string",
          "multiValued": false,
          "description": "Unique Identifier for a user as defined by provisioning client. Note - CaseExact=false which is not per RFC.",
          "required": false,
          "caseExact": false,
          "mutability": "readWrite",
          "returned": "default",
          "uniqueness": "none"
        },
        {
          "name": "userName",
          "type": "string",
          "multiValued": false,
          "description": "Username of the User. It is a Required attribute and uniquely identifies a User",
          "required": true,
          "caseExact": false,
          "mutability": "readOnly",
          "returned": "default",
          "uniqueness": "server"
        },
        {
          "name": "name",
          "type": "complex",
          "subAttributes": [
            {
              "name": "familyName",
              "type": "string",
              "multiValued": false,
              "description": "Family name of the User",
              "required": true,
              "caseExact": false,
              "mutability": "readWrite",
              "returned": "default",
              "uniqueness": "none"
            },
            {
              "name": "givenName",
              "type": "string",
              "multiValued": false,
              "description": "Given name of the User",
              "required": true,
              "caseExact": false,
              "mutability": "readWrite",
              "returned": "default",
              "uniqueness": "none"
            },
            {
              "name": "formatted",
              "type": "string",
              "multiValued": false,
              "description": "Formatted name of the User",
              "required": false,
              "caseExact": false,
              "mutability": "readOnly",
              "returned": "default",
              "uniqueness": "none"
            }
          ],
          "multiValued": false,
          "description": "Components of users real name",
          "required": true,
          "caseExact": false,
          "mutability": "readWrite",
          "returned": "default",
          "uniqueness": "none"
        },
        {
          "name": "displayName",
          "type": "string",
          "multiValued": false,
          "description": "Display Name of the User. It is generated by concatenating givenName and familyName.",
          "required": false,
          "caseExact": false,
          "mutability": "readOnly",
          "returned": "default",
          "uniqueness": "none"
        },
        {
          "name": "active",
          "type": "boolean",
          "multiValued": false,
          "description": "Used to manage whether user can log into Anaplan system or not",
          "required": false,
          "caseExact": false,
          "mutability": "readWrite",
          "returned": "default",
          "uniqueness": "none"
        },
        {
          "name": "entitlements",
          "type": "complex",
          "multiValued": true,
          "description": "A list of entitlements for the User that represents a thing (such as WORKSPACE) the User has.",
          "required": false,
          "caseExact": false,
          "mutability": "readWrite",
          "returned": "default",
          "uniqueness": "none",
          "subAttributes": [
            {
              "name": "value",
              "type": "string",
              "multiValued": false,
              "description": "The target resourceId of an entitlement. e.g. a WorkspaceId",
              "required": false,
              "caseExact": false,
              "mutability": "readWrite",
              "returned": "default",
              "uniqueness": "none"
            },
            {
              "name": "display",
              "type": "string",
              "multiValued": false,
              "description": "A human-readable name for the entitlement. e.g. a Workspace 'name'",
              "required": false,
              "caseExact": false,
              "mutability": "readWrite",
              "returned": "default",
              "uniqueness": "none"
            },
            {
              "name": "type",
              "type": "string",
              "multiValued": false,
              "description": "The type of entitlement. e.g. WORKSPACE",
              "required": false,
              "caseExact": false,
              "mutability": "readOnly",
              "returned": "default",
              "uniqueness": "none"
            },
            {
              "name": "primary",
              "type": "boolean",
              "multiValued": false,
              "description": "A Boolean value indicating the 'primary' or preferred attribute value for this attribute. The primary attribute value 'true' MUST appear no more than once.",
              "required": false,
              "caseExact": false,
              "mutability": "readOnly",
              "returned": "default",
              "uniqueness": "none"
            }
          ]
        }
      ]
    }
  ]
}
```

### Differences to the SCIM Standard

- Unsupported: include/exclude query parameters
- Unsupported: requests without a path
- Unsupported: logical operators (AND, OR, NOT)
- Entitlement updates are not atomic:
  - Anaplan stores entitlements in a separate datastore from User data. If an error occurs storing Entitlements, the user data is retained and a response is returned that indicates partial success and the error status for the failure.

## SCIM error codes

Below are some of the error codes that you may encounter when using the Anaplan SCIM APIs. In the event that a call is only partially successful, an error message is returned to indicate what parts of the operation succeeded, and those that need your attention.

### Error response shape

There are two types of error responses.

**Standard ErrorResponse:**

```http
HTTP/1.1 404 Not Found
```

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "detail": "Resource 2819c223-7f76-453a-919d-413861904646 not found",
  "status": "404"
}
```

**ErrorResponse with scimType (provides more error information):**

```http
HTTP/1.1 403 Forbidden
```

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "detail": "Query filter involving 'name' is restricted or confidential",
  "scimType": "sensitive",
  "status": "404"
}
```

### Error codes and explanations

| HTTP Status Code | Description |
|------------------|-------------|
| 200 (Ok) | Shows success. |
| 201 (Created) | Resource successfully created using POST or PUT request. Returns link to the newly created resource using the location header. |
| 202 (Accepted) | The request was successfully received and will be processed at a later time. |
| 204 (No Content) | Response body is empty. For example, a DELETE request. |
| 207 (Multi-Status) | Multiple responses for a collection of resources. For example, 200 OK for User1 and 400 Bad Request for User2. |
| 302 (Found) | The resource can be found at the location specified by the Location response header. |
| 400 (Bad Request) | Invalid input provided. For example, validation error, missing data. For SCIM specific error types, refer to RFC 7644. |
| 405 (Method Unavailable) | The user is not allowed to access the method. For example, only beta customers. |
| 406 (Not Acceptable) | The server is unable to produce a response in the format requested. For example, `Accept: application/xml`. |
| 409 (Conflict) | Conflict situation while executing the method. For example, adding duplicate entry. |
| 412 (Precondition Failed) | Failed to update. The resource has changed on the server. |
| 500 (Internal Server Error) | The server has thrown an exception while executing the method. |
| 501 (Not Implemented) | The requested operation is not supported by the service provider. For example, a capability not supported such as DELETE. |

## Identity Provider Integration

Anaplan SCIM services follow the SCIM standard and are designed to integrate with Identity Provider vendors such as Okta.

### Vendor Integration

Each vendor interprets the SCIM specification in their own way. As a result, they sometimes use functionality not specifically defined in the SCIM specification.

Anaplan has tested thoroughly with Okta specifically.

For integration issues found with other vendors, reach out to your Anaplan account representative or make requests at the [Anaplan Idea Exchange](https://community.anaplan.com/t5/Idea-Exchange/idb-p/AnaplanIdeas).

### Okta Integration

Okta provides a rich set of capabilities to manage enterprise users. Supported features with Anaplan SCIM are:

- Basic Auth
- OAuth 2
- API Keys
- Okta to Anaplan User integration
- Custom Field Mapping (mapping workspace IDs to entitlements)
- User Import

Before you begin, make sure you have created an [Okta application](https://help.okta.com/en/prod/Content/Topics/Apps/Apps_App_Integration_Wizard.htm) and checked for [Anaplan specific configurations](https://help.anaplan.com/8c62efdf-d7c4-4457-b6ca-451a82484b5c-Provide-your-SSO-details-to-your-identity-provider).

#### Okta to Anaplan integration steps

| Step | Label | Value | Details |
|------|-------|-------|---------|
| Create Okta Application | name | | In the Application dialog choose Create Application. |
| Enter Login URL | Login URL | `https://sdp.anaplan.com/launchpad/` | The login page is not required for SCIM integration but Okta requires this for other use-cases. |
| Turn on SCIM Provisioning | Enable SCIM Provisioning | 1 | In the Okta Application, it is a Checkbox under General. |
| Provisioning Integration (1 of 6) | Base URL | `https://api.anaplan.com/scim/1/0/v2` | In the Provisioning tab under integration. |
| Step 2 | Unique Identifier Field | `userName` | In the Provisioning tab under integration. |
| Step 3 | Import New Users and Profile Updates | 0 | In the Provisioning tab under integration. |
| Step 4 | Push New Users | 1 | In the Provisioning tab under integration. |
| Step 5 | Push Profile Updates | 1 | In the Provisioning tab under integration. |
| Step 6 | Push Groups | 0 | In the Provisioning tab under integration. |

#### Authentication options

| Step | Label | Value | Details |
|------|-------|-------|---------|
| Enable Authentication Option 1 | Authentication Mode | Basic Auth | In the Provisioning tab under integration. Then enter your username and password. User must have USER_ADMIN role in Anaplan. |
| Enable Authentication Option 2 (1 of 5) | Authentication Mode | OAuth 2 | In the Provisioning tab under integration. |
| Step 2 | Access token endpoint URL | `https://us1a.app.anaplan.com/oauth/token` | |
| Step 3 | Authorization endpoint URL | `https://us1a.app.anaplan.com/auth/authorize?response_type=code&scope=openid profile email offline_access` | |
| Step 4 | Client ID | | In Anaplan, navigate to **Administration** and select OAuth clients under **Security**. |
| Step 5 | Client Secret | | In Anaplan, navigate to **Administration** and select OAuth clients under **Security**. In Okta, save your changes then select Authenticate with... Then enter your username and password. User must have USER_ADMIN role in Anaplan. |
| Enable Authentication Option 3 | Authentication Mode | API Key | In the Provisioning tab under integration. Select Authentication Mode "HTTP Header". Enter the API key created in Anaplan. The user for whom the key was created must have USER_ADMIN role in Anaplan. |

#### Okta to Anaplan Provisioning

| Step | Label | Value | Details |
|------|-------|-------|---------|
| Step 1 | Create Users | 1 | In the Provisioning tab under To App. |
| Step 2 | Update User Attributes | 1 | In the Provisioning tab under To App. |
| Step 3 | Deactivate Users | 1 | In the Provisioning tab under To App. |
| Step 4 | Sync Password | 0 | In the Provisioning tab under To App. |

#### Adding a Custom Field for Workspace GUIDs

| Step | Label | Value | Details |
|------|-------|-------|---------|
| Step 1 | Data Type | String | In the Profile Editor for your App choose Add Attribute. |
| Step 2 | Display Name | Anaplan Workspace Ids | |
| Step 3 | Variable Name | `anaplan_workspace_ids` | |
| Step 4 | External Name | `entitlements.^[type=='WORKSPACE_IDS'].value` | A mapping from this variable to the SCIM Entitlements objects. Anaplan supports a comma-delimited list of Workspace GUIDs. |
| Step 5 | External Namespace | `urn:ietf:params:scim:schemas:core:2.0:User` | The SCIM schema definition for a User. |
| Step 6 | Scope - user personal | 1 | |

#### Adding a Custom Field for Workspace Names

| Step | Label | Value | Details |
|------|-------|-------|---------|
| Step 1 | Data Type | String | In the Profile Editor for your App choose Add Attribute. |
| Step 2 | Display Name | Anaplan Workspace Names | |
| Step 3 | Variable Name | `anaplan_workspace_names` | |
| Step 4 | External Name | `entitlements.^[type=='WORKSPACE_NAMES'].value` | A mapping from this variable to the SCIM Entitlements objects. Anaplan supports a comma-delimited list of Workspace Names. |
| Step 5 | External Namespace | `urn:ietf:params:scim:schemas:core:2.0:User` | The SCIM schema definition for a User. |
| Step 6 | Scope - user personal | 1 | |

#### Assigning Okta users to the Anaplan SCIM application

| Step | Details |
|------|---------|
| Assign a user to an Anaplan application | In the Assignments tab, select Assign to People from the dropdown menu **Assign**. |
| Assign users via groups | In the Assignments tab, select Assign to Groups from the dropdown menu **Assign**. |
| Provide workspace access to a user | Select the **Edit User Assignment** icon, to the right of the user entry. Enter a comma-separated list of workspace IDs in the Anaplan Workspace Assignments field. Alternatively, enter a comma-separated list of workspace names into the Anaplan Workspace Names field. Note: The field accepts CSV format. |

### Azure Integration

Authorized users can use API keys to integrate with Microsoft Azure (or other Identity Providers that support API Keys).
