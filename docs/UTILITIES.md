# Utilities Documentation

## Custom Errors (`src/utils/customErrors.js`)

Библиотека от custom error класове за консистентно error handling.

### Налични класове:

- **AppError** - Базов клас за всички application errors
- **ValidationError** (400) - Validation грешки
- **UnauthorizedError** (401) - Authentication грешки
- **ForbiddenError** (403) - Authorization грешки
- **NotFoundError** (404) - Ресурс не е намерен
- **ConflictError** (409) - Duplicate/conflict грешки
- **InternalServerError** (500) - Сървърни грешки
- **ServiceUnavailableError** (503) - Service недостъпен

### Примери:

```javascript
const { NotFoundError, ValidationError } = require('../utils/customErrors');

// Хвърляне на грешка
if (!company) {
  throw new NotFoundError('Company');
}

// С детайли
throw new ValidationError('Invalid input', {
  field: 'email',
  message: 'Email is required'
});
```

## Async Handler (`src/utils/asyncHandler.js`)

Wrapper за async route handlers, който автоматично catch-ва грешки.

### Употреба:

```javascript
const asyncHandler = require('../utils/asyncHandler');

router.get('/:id', asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new NotFoundError('Company');
  }
  res.json(company);
}));
```

## Logger (`src/utils/logger.js`)

Winston logger с file rotation и console транспорт.

### Features:

- Console logging с colorize
- File logging с rotation (max 5MB, 5 files)
- Separate error log
- Exception и rejection handling
- Timestamp форматиране

### Употреба:

```javascript
const logger = require('../utils/logger');

logger.info('Information message');
logger.warn('Warning message', { extra: 'data' });
logger.error('Error message', { error: err });
logger.debug('Debug message');
```

## Environment Validation (`src/config/validateEnv.js`)

Валидира задължителни environment variables при startup.

### Required variables:

- PORT
- MONGO_URI
- RABBITMQ_URL
- ALLOWED_ORIGINS

### Warnings:

- JWT_PUBLIC_KEY_B64 (warning ако липсва)

### Употреба:

```javascript
const validateEnv = require('./config/validateEnv');

try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed');
  process.exit(1);
}
```
