# Middlewares Documentation

## Overview

Всички middlewares в Company Service са организирани в `src/middlewares/` директорията и осигуряват различни аспекти на security, authentication, validation и logging.

---

## Authentication Middleware (`authMiddleware.js`)

### `authenticate`

Валидира JWT токен и добавя user информация към request.

**Употреба:**
```javascript
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/protected', authenticate, (req, res) => {
  // req.user е достъпен тук
  res.json({ user: req.user });
});
```

**req.user структура:**
```javascript
{
  id: 'user-id',
  email: 'user@example.com',
  roles: ['admin', 'company_admin'],
  companyId: 'company-id'
}
```

**Грешки:**
- 401 - Missing or invalid authorization header
- 401 - Token expired
- 401 - Invalid token
- 500 - Server configuration error (production без JWT key)

### `optionalAuthenticate`

Същото като `authenticate`, но не фейлва ако няма токен.

**Употреба:**
```javascript
router.get('/public-or-protected', optionalAuthenticate, (req, res) => {
  if (req.user) {
    // Authenticated user
  } else {
    // Anonymous user
  }
});
```

---

## Role Middleware (`roleMiddleware.js`)

### `requireRole(allowedRoles)`

Проверява дали потребителят има една от посочените роли.

**Параметри:**
- `allowedRoles` (string[]) - Array от разрешени роли

**Употреба:**
```javascript
const { requireRole } = require('../middlewares/roleMiddleware');

router.delete('/:id', 
  authenticate, 
  requireRole(['admin']), 
  deleteCompany
);
```

**Грешки:**
- 401 - Authentication required
- 403 - Insufficient permissions

### `requireAdmin()`

Shorthand за `requireRole(['admin'])`.

**Употреба:**
```javascript
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/admin-only', authenticate, requireAdmin(), handler);
```

### `requireCompanyAdmin()`

Проверява за admin или company_admin роля.

**Употреба:**
```javascript
router.put('/:id', 
  authenticate, 
  requireCompanyAdmin(), 
  updateCompany
);
```

### `requireOwnershipOrAdmin(field)`

Проверява дали потребителят е owner на ресурса или admin.

**Параметри:**
- `field` (string) - Field name за проверка на ownership (default: 'id')

**Употреба:**
```javascript
router.put('/:userId/profile', 
  authenticate, 
  requireOwnershipOrAdmin('userId'), 
  updateProfile
);
```

---

## Validation Middleware (`validationMiddleware.js`)

Проверява express-validator резултати и хвърля ValidationError ако има грешки.

**Употреба:**
```javascript
const validate = require('../middlewares/validationMiddleware');
const { createCompanyValidation } = require('../validators/companyValidators');

router.post('/', 
  authenticate,
  createCompanyValidation,
  validate,
  createCompany
);
```

**Грешки:**
- 400 - Validation failed (с детайли за полетата)

---

## Error Middleware (`errorMiddleware.js`)

Централизирана обработка на грешки.

**Обработва:**
- Custom application errors
- Mongoose validation errors
- Mongoose CastError (invalid ObjectId)
- Duplicate key errors (MongoDB)
- JWT errors
- Generic errors

**Логване:**
- 5xx грешки → `logger.error()` с stack trace
- 4xx грешки → `logger.warn()`

**Response формат:**
```json
{
  "error": {
    "message": "Error message",
    "details": { /* optional details */ },
    "stack": "..." // само в development mode за 5xx
  }
}
```

---

## Request Logger (`requestLogger.js`)

Логва всички HTTP заявки и отговори.

**Логва:**
- Incoming request: method, url, ip, user-agent
- Response: method, url, statusCode, duration, ip

**Log levels:**
- `info` - successful requests (2xx, 3xx)
- `warn` - client errors (4xx, 5xx)

---

## Rate Limiter (`rateLimiter.js`)

Ограничава броя заявки от един IP адрес.

### `apiLimiter`

Общ rate limiter за API endpoints.
- **Лимит:** 100 заявки / 15 минути / IP
- **Header:** RateLimit-*

**Употреба:**
```javascript
app.use('/api/', apiLimiter);
```

### `authLimiter`

Строг rate limiter за authentication endpoints.
- **Лимит:** 5 заявки / 15 минути / IP
- **Пропуска:** Успешни заявки не се броят

**Употреба:**
```javascript
router.post('/login', authLimiter, loginHandler);
```

### `createLimiter`

Rate limiter за create операции.
- **Лимит:** 20 заявки / 1 час / IP

**Употреба:**
```javascript
router.post('/', authenticate, createLimiter, createCompany);
```

**Response при надвишен лимит:**
```json
{
  "error": {
    "message": "Too many requests, please try again later",
    "retryAfter": "15 minutes"
  }
}
```

---

## CORS Configuration (`corsConfig.js`)

Конфигурация за Cross-Origin Resource Sharing.

**Функции:**
- Проверява origin срещу ALLOWED_ORIGINS env variable
- Разрешава credentials (cookies)
- Експортира custom headers

**Разрешени методи:**
- GET, POST, PUT, DELETE, PATCH, OPTIONS

**Exposed headers:**
- X-Total-Count
- X-Page
- X-Per-Page

**Конфигурация:**
```env
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

---

## Middlewares Chain Example

Пълен пример за protected endpoint с всички middlewares:

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { createLimiter } = require('../middlewares/rateLimiter');
const { createCompanyValidation } = require('../validators/companyValidators');
const { createCompany } = require('../controllers/companyController');

router.post('/',
  createLimiter,              // 1. Rate limiting
  authenticate,               // 2. Authentication
  requireAdmin(),             // 3. Authorization
  createCompanyValidation,    // 4. Validation rules
  validate,                   // 5. Validation check
  createCompany               // 6. Controller
);

module.exports = router;
```

---

## Error Handling

Всички middlewares използват `next(error)` за предаване на грешки към error middleware.

**Custom errors:**
```javascript
const { UnauthorizedError, ForbiddenError } = require('../utils/customErrors');

// В middleware
if (!token) {
  throw new UnauthorizedError('Token required');
}

// Или
next(new ForbiddenError('Access denied'));
```

**Автоматична обработка:**
- Custom errors → запазва statusCode
- Mongoose errors → 400
- JWT errors → 401
- Duplicate key → 409
- Unknown errors → 500

---

## Best Practices

1. **Ред на middlewares:**
   - Rate limiting → Authentication → Authorization → Validation → Controller

2. **Error handling:**
   - Използвай custom errors от `utils/customErrors.js`
   - Винаги предавай errors с `next(error)`

3. **Logging:**
   - Middlewares автоматично логват важни събития
   - Не дублирай logging в controllers

4. **Security:**
   - Винаги валидирай input данни
   - Използвай rate limiting за sensitive endpoints
   - JWT key задължително в production

5. **Performance:**
   - Rate limiter намалява риска от abuse
   - CORS кеш (maxAge: 24h) намалява preflight заявки
