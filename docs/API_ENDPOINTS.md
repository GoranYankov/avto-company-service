# Company Service API Endpoints

Всички endpoint-и изискват authentication чрез JWT token в Authorization header.

## Base URL
```
http://localhost:4001/api/company
```

## Authentication
Всички заявки трябва да включват JWT token:
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Create Company
Създава нова компания.

**Endpoint:** `POST /api/company`  
**Authentication:** Required  
**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "name": "Test Company Ltd",
  "email": "contact@testcompany.com",
  "phone": "+359888123456",
  "eik": "123456789",
  "vatNumber": "BG123456789",
  "address": {
    "street": "ul. Test 123",
    "city": "Sofia",
    "country": "Bulgaria"
  },
  "subscription": {
    "type": "free"
  }
}
```

**Required Fields:**
- `name` (string, 2-100 chars)
- `email` (valid email)

**Optional Fields:**
- `phone` (string, valid phone format)
- `eik` (string, max 20 chars)
- `vatNumber` (string)
- `address` (object)
  - `street` (string, max 200 chars)
  - `city` (string, max 100 chars)
  - `country` (string, max 100 chars)
- `subscription.type` (enum: 'free', 'standard', 'premium')
- `subscription.expiresAt` (ISO8601 date)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Test Company Ltd",
    "email": "contact@testcompany.com",
    "createdBy": "507f1f77bcf86cd799439012",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2025-10-24T10:00:00.000Z",
    "updatedAt": "2025-10-24T10:00:00.000Z"
  },
  "message": "Company created successfully"
}
```

**Security:**
- Users cannot set `isVerified`, `createdBy`, `isActive` fields
- Email must be unique
- Creator is automatically set to authenticated user

---

### 2. Get All Companies
Получава списък с компании с pagination и filtering.

**Endpoint:** `GET /api/company`  
**Authentication:** Required  
**Authorization:** Any authenticated user (non-admins see only active companies)

**Query Parameters:**
- `page` (integer, min: 1, default: 1)
- `limit` (integer, min: 1, max: 100, default: 10)
- `sortBy` (enum: 'name', 'email', 'createdAt', 'updatedAt', default: 'createdAt')
- `sortOrder` (enum: 'asc', 'desc', default: 'desc')
- `search` (string, max 100 chars) - text search
- `isActive` (boolean) - filter by active status (admin only)
- `isVerified` (boolean) - filter by verification status

**Example:**
```
GET /api/company?page=1&limit=10&sortBy=createdAt&sortOrder=desc&isVerified=true
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Test Company Ltd",
      "email": "contact@testcompany.com",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2025-10-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

**Security:**
- Non-admin users can only see active companies
- Results are capped at 100 per page

---

### 3. Get Company by ID
Получава детайли за конкретна компания.

**Endpoint:** `GET /api/company/:id`  
**Authentication:** Required  
**Authorization:** Owner or Admin

**Path Parameters:**
- `id` (MongoDB ObjectId) - Company ID

**Example:**
```
GET /api/company/507f1f77bcf86cd799439011
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Test Company Ltd",
    "email": "contact@testcompany.com",
    "phone": "+359888123456",
    "eik": "123456789",
    "vatNumber": "BG123456789",
    "address": {
      "street": "ul. Test 123",
      "city": "Sofia",
      "country": "Bulgaria"
    },
    "createdBy": "507f1f77bcf86cd799439012",
    "subscription": {
      "type": "free"
    },
    "isActive": true,
    "isVerified": false,
    "createdAt": "2025-10-24T10:00:00.000Z",
    "updatedAt": "2025-10-24T10:00:00.000Z"
  }
}
```

**Errors:**
- `403 Forbidden` - User is not owner or admin
- `404 Not Found` - Company not found or inactive

---

### 4. Update Company
Обновява данни на компания.

**Endpoint:** `PUT /api/company/:id` or `PATCH /api/company/:id`  
**Authentication:** Required  
**Authorization:** Owner or Admin

**Path Parameters:**
- `id` (MongoDB ObjectId) - Company ID

**Request Body:** (всички полета са optional)
```json
{
  "name": "Updated Company Name",
  "email": "newemail@company.com",
  "phone": "+359888999888",
  "address": {
    "city": "Plovdiv"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Company Name",
    "email": "newemail@company.com",
    "updatedAt": "2025-10-24T11:00:00.000Z"
  },
  "message": "Company updated successfully"
}
```

**Security:**
- Non-admin users cannot update `isVerified`, `createdBy`, `isActive` fields
- Email uniqueness is enforced
- Empty update requests return 400 Bad Request
- Protected system fields (`_id`, `createdAt`, `updatedAt`) cannot be modified

**Errors:**
- `400 Bad Request` - No update data provided
- `403 Forbidden` - User is not owner or admin
- `404 Not Found` - Company not found
- `409 Conflict` - Email already in use

---

### 5. Delete Company
Изтрива компания (soft delete).

**Endpoint:** `DELETE /api/company/:id`  
**Authentication:** Required  
**Authorization:** Owner or Admin

**Path Parameters:**
- `id` (MongoDB ObjectId) - Company ID

**Example:**
```
DELETE /api/company/507f1f77bcf86cd799439011
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

**Note:** 
- Това е soft delete - полето `isActive` се сетва на `false`
- Компанията остава в базата данни но не се показва в нормални заявки
- Админи могат да възстановят компанията като променят `isActive` на `true`

**Errors:**
- `403 Forbidden` - User is not owner or admin
- `404 Not Found` - Company not found

---

### 6. Get My Companies
Получава всички компании създадени от текущия потребител.

**Endpoint:** `GET /api/company/my/companies`  
**Authentication:** Required  
**Authorization:** Any authenticated user

**Example:**
```
GET /api/company/my/companies
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "My Company 1",
      "email": "company1@example.com",
      "isActive": true,
      "createdAt": "2025-10-24T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "My Company 2",
      "email": "company2@example.com",
      "isActive": true,
      "createdAt": "2025-10-23T10:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

### 7. Get Company Statistics (Admin Only)
Получава статистика за компаниите в системата.

**Endpoint:** `GET /api/company/stats`  
**Authentication:** Required  
**Authorization:** Admin only

**Example:**
```
GET /api/company/stats
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 142,
    "inactive": 8,
    "verified": 98,
    "unverified": 52,
    "bySubscription": {
      "free": 120,
      "standard": 25,
      "premium": 5
    }
  }
}
```

**Errors:**
- `403 Forbidden` - User is not admin

---

## Error Responses

Всички endpoint-и могат да върнат следните error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Missing or invalid authorization header"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Company not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Company with this email already exists"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (only in development)"
}
```

---

## Security Best Practices

### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Rate Limiting
- API requests са ограничени до определен брой заявки на минута
- При превишаване получавате 429 Too Many Requests

### Input Validation
- Всички входни данни се валидират автоматично
- XSS и SQL injection защита е вградена
- Email адреси се нормализират и lowercase-ват

### Authorization
- JWT токените се валидират с RS256 алгоритъм
- Всеки endpoint проверява permissions
- Ownership се проверява за CRUD операции

### Data Protection
- Sensitive полета не могат да се променят от non-admin users
- Soft delete предотвратява загуба на данни
- Audit trail чрез `createdBy` и timestamps

---

## Testing Examples (cURL)

### Create Company
```bash
curl -X POST http://localhost:4001/api/company \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@company.com"
  }'
```

### Get Company
```bash
curl -X GET http://localhost:4001/api/company/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Company
```bash
curl -X PUT http://localhost:4001/api/company/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name"
  }'
```

### Delete Company
```bash
curl -X DELETE http://localhost:4001/api/company/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Companies
```bash
curl -X GET http://localhost:4001/api/company/my/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
