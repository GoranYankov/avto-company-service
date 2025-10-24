# Company Service API Documentation

Base URL: `http://localhost:4001/api`

## Authentication

All endpoints (except health checks) require JWT authentication via Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Health Check Endpoints

### Get Health Status
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "company-service",
  "timestamp": "2025-10-23T10:00:00.000Z",
  "uptime": 123.45
}
```

### Liveness Probe
```http
GET /health/liveness
```

**Response:** `200 OK`

### Readiness Probe
```http
GET /health/readiness
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-10-23T10:00:00.000Z",
  "checks": {
    "mongodb": {
      "status": "up",
      "state": "connected",
      "responseTime": "5ms"
    },
    "rabbitmq": {
      "status": "not_implemented"
    }
  }
}
```

---

## Company Endpoints

### Create Company
```http
POST /company
```

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA"
  },
  "subscription": {
    "type": "premium",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "country": "USA"
    },
    "createdBy": "507f191e810c19729de860ea",
    "subscription": {
      "type": "premium",
      "expiresAt": "2026-12-31T23:59:59.000Z"
    },
    "isActive": true,
    "isVerified": false,
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error
- `401` - Unauthorized
- `409` - Company with email already exists
- `429` - Rate limit exceeded (20 creates/hour)

---

### Get All Companies (Admin Only)
```http
GET /company?page=1&limit=10&sortBy=createdAt&sortOrder=desc&search=acme&isActive=true
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page
- `sortBy` (string) - Field to sort by (name, email, createdAt, updatedAt)
- `sortOrder` (string) - asc or desc
- `search` (string) - Text search in name and email
- `isActive` (boolean) - Filter by active status
- `isVerified` (boolean) - Filter by verified status

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2025-10-23T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

**Errors:**
- `401` - Unauthorized
- `403` - Forbidden (not admin)

---

### Get Company by ID
```http
GET /company/:id
```

**Path Parameters:**
- `id` (string) - Company ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "country": "USA"
    },
    "createdBy": "507f191e810c19729de860ea",
    "subscription": {
      "type": "premium",
      "expiresAt": "2026-12-31T23:59:59.000Z"
    },
    "isActive": true,
    "isVerified": true,
    "subscriptionStatus": "active",
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid company ID
- `401` - Unauthorized
- `403` - Forbidden (not owner or admin)
- `404` - Company not found

---

### Update Company
```http
PUT /company/:id
```

**Path Parameters:**
- `id` (string) - Company ID

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Acme Corporation Updated",
  "phone": "+9876543210",
  "address": {
    "city": "Los Angeles"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation Updated",
    "email": "contact@acme.com",
    "phone": "+9876543210",
    "address": {
      "street": "123 Main St",
      "city": "Los Angeles",
      "country": "USA"
    },
    "updatedAt": "2025-10-23T11:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error or invalid ID
- `401` - Unauthorized
- `403` - Forbidden (not owner or admin)
- `404` - Company not found
- `409` - Email already in use

**Notes:**
- Non-admin users cannot update `isVerified` or `createdBy` fields
- Only admins can update any field

---

### Delete Company (Admin Only)
```http
DELETE /company/:id
```

**Path Parameters:**
- `id` (string) - Company ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

**Errors:**
- `400` - Invalid company ID
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Company not found

**Notes:**
- This is a soft delete (sets `isActive` to false)
- Data is not permanently removed from database

---

### Get My Companies
```http
GET /company/my/companies
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "My Company",
      "email": "my@company.com",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2025-10-23T10:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized

---

### Get Company Statistics (Admin Only)
```http
GET /company/stats
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 145,
    "verified": 120,
    "subscriptions": {
      "free": 100,
      "standard": 30,
      "premium": 15
    }
  }
}
```

**Errors:**
- `401` - Unauthorized
- `403` - Forbidden (not admin)

---

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "details": [
      {
        "field": "email",
        "message": "Email is required",
        "value": ""
      }
    ]
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Create Operations**: 20 requests per hour per IP
- **Auth Operations**: 5 requests per 15 minutes per IP

Rate limit information is returned in response headers:
- `RateLimit-Limit` - Request limit
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Time when limit resets

## Pagination

Paginated endpoints include:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

## Examples

### cURL Examples

**Create Company:**
```bash
curl -X POST http://localhost:4001/api/company \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@company.com",
    "phone": "+1234567890"
  }'
```

**Get My Companies:**
```bash
curl -X GET http://localhost:4001/api/company/my/companies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Company:**
```bash
curl -X PUT http://localhost:4001/api/company/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name"
  }'
```
