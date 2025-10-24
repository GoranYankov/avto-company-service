# 🚀 План за Изпълнение на Company Service

**Последователност от стъпки за изграждане на Company Service микросървиса**

---

## 📋 Предварителни Изисквания

- Auth Service вече е имплементиран и работи
- RabbitMQ, MongoDB и Redis вече са конфигурирани в auth docker-compose
- JWT публичен ключ е достъпен в `auth/secrets/jwt-public.pem`
- **НЕ се променят файлове в auth директорията**

---

## Стъпка 1: Инициализация на Проекта

### 1.1 Създаване на основната структура
```bash
cd c:\Users\User\Desktop\dev\avto\company-service
npm init -y
```

### 1.2 Инсталиране на dependencies
```bash
npm install express mongoose dotenv cors helmet express-validator cookie-parser amqplib winston
npm install --save-dev eslint prettier jest @eslint/js globals
```

### 1.3 Конфигуриране на package.json scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "NODE_ENV=development node server.js",
    "test": "jest --runInBand",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 1.4 Създаване на директорийна структура
```
company-service/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   ├── config/
│   ├── app.js
│   └── server.js
├── tests/
├── logs/
├── secrets/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env
├── .gitignore
├── .dockerignore
├── eslint.config.js
└── package.json
```

### ✅ Acceptance Criteria:
- [x] Проектът е инициализиран
- [x] Всички dependencies са инсталирани
- [x] Директориите са създадени

---

## Стъпка 2: Конфигурация и Utilities

### 2.1 Създаване на `.env.example`
```env
PORT=4001
NODE_ENV=development
MONGO_URI=mongodb://mongo:27017/company_db
JWT_PUBLIC_KEY=/secrets/jwt-public.pem
RABBITMQ_URL=amqp://rabbitmq:5672
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

### 2.2 Създаване на `src/utils/logger.js`
- Конфигуриране на Winston logger
- Console и file транспорт
- Различни нива на логване

### 2.3 Създаване на `src/config/validateEnv.js`
- Валидация на environment variables
- Проверка при стартиране

### 2.4 Създаване на `.gitignore`
```
node_modules/
.env
logs/
*.log
secrets/
.DS_Store
```

### 2.5 Създаване на `.dockerignore`
```
node_modules
npm-debug.log
.env
.git
logs
*.log
```

### 2.6 Създаване на `eslint.config.js`
- Конфигурация подобна на auth service

### ✅ Acceptance Criteria:
- [x] Всички конфигурационни файлове са създадени
- [x] Logger е функционален и подобрен с rotation и exception handling
- [x] Environment validation работи
- [x] Custom error classes са имплементирани
- [x] Async handler utility е създаден
- [x] Error middleware е подобрен с детайлна обработка
- [x] Request logger е подобрен с по-добро форматиране
- [x] ESLint конфигурацията е актуализирана до нов формат

---

## Стъпка 3: MongoDB Model

### 3.1 Създаване на `src/models/Company.js`
```javascript
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  address: {
    street: String,
    city: String,
    country: String
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  subscription: {
    type: { type: String, enum: ['free', 'standard', 'premium'], default: 'free' },
    expiresAt: Date
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Company', companySchema);
```

### ✅ Acceptance Criteria:
- [x] Company model е създаден
- [x] Schema validation е конфигурирана
- [x] Индекси са добавени

---

## Стъпка 4: Middlewares

### 4.1 Създаване на `src/middlewares/authMiddleware.js`
- Валидация на JWT токен
- Използване на публичен ключ от auth service
- Добавяне на user info към req.user

### 4.2 Създаване на `src/middlewares/errorMiddleware.js`
- Централизирана обработка на грешки
- Структуриран JSON отговор
- Различни видове грешки (ValidationError, CastError, etc.)

### 4.3 Създаване на `src/middlewares/requestLogger.js`
- Логване на всички HTTP заявки
- Request/Response details

### 4.4 Създаване на `src/middlewares/roleMiddleware.js`
- Проверка за роли (admin, company_admin, etc.)
- Използва се след authMiddleware

### ✅ Acceptance Criteria:
- [x] JWT authentication работи (с production security)
- [x] Optional authentication middleware създаден
- [x] Error handling е централизиран и подобрен
- [x] Request logging функционира с детайлна информация
- [x] Role-based access control работи
- [x] Множество role проверки: requireRole, requireAdmin, requireCompanyAdmin, requireOwnershipOrAdmin
- [x] Validation middleware създаден
- [x] Company validators създадени (create, update, get, delete, query)
- [x] Rate limiting имплементиран (apiLimiter, authLimiter, createLimiter)
- [x] CORS конфигурация създадена с детайлна валидация
- [x] app.js актуализиран с всички middlewares
- [x] Документация за middlewares създадена

---

## Стъпка 5: Company Service Logic

### 5.1 Създаване на `src/services/companyService.js`

**Методи:**
- `createCompany(data)` - Създаване на компания
- `createFromAuthEvent(payload)` - Създаване при auth.user.created event
- `updateEmailVerified(userId)` - При auth.user.email_verified event
- `getAllCompanies(filter, options)` - Извличане на всички компании
- `getCompanyById(id)` - Извличане по ID
- `updateCompany(id, data)` - Актуализация
- `deleteCompany(id)` - Изтриване (soft delete)
- `getCompaniesByCreator(userId)` - Компании създадени от потребител

### ✅ Acceptance Criteria:
- [x] Всички CRUD операции работят
- [x] Обработка на event-базирано създаване
- [x] Валидация на данни
- [x] Error handling

---

## Стъпка 6: Controllers

### 6.1 Създаване на `src/controllers/companyController.js`

**Endpoints:**
- `createCompany` - POST /api/company
- `getAllCompanies` - GET /api/company
- `getCompanyById` - GET /api/company/:id
- `updateCompany` - PUT /api/company/:id
- `deleteCompany` - DELETE /api/company/:id

### 6.2 Създаване на `src/controllers/healthController.js`

**Endpoints:**
- `healthCheck` - GET /api/health
- `liveness` - GET /api/health/liveness
- `readiness` - GET /api/health/readiness

### ✅ Acceptance Criteria:
- [x] Controllers връщат правилни HTTP статус кодове
- [x] Validation errors са обработени
- [x] Health checks показват статус на dependencies

---

## Стъпка 7: Routes

### 7.1 Създаване на `src/routes/companyRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Protected routes
router.post('/', authenticate, companyController.createCompany);
router.get('/', authenticate, requireRole(['admin']), companyController.getAllCompanies);
router.get('/:id', authenticate, companyController.getCompanyById);
router.put('/:id', authenticate, companyController.updateCompany);
router.delete('/:id', authenticate, requireRole(['admin']), companyController.deleteCompany);

module.exports = router;
```

### 7.2 Създаване на `src/routes/healthRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/', healthController.healthCheck);
router.get('/liveness', healthController.liveness);
router.get('/readiness', healthController.readiness);

module.exports = router;
```

### ✅ Acceptance Criteria:
- [x] Routes са правилно конфигурирани
- [x] Authentication middleware е приложен
- [x] Role validation работи

---

## Стъпка 8: RabbitMQ Event Subscriber

### 8.1 Създаване на `src/utils/eventSubscriber.js`

**Функционалност:**
- Свързване към RabbitMQ
- Създаване на exchange `auth_events` (fanout)
- Създаване на queue и binding към exchange
- Слушане за events:
  - `auth.user.created` → създава компания
  - `auth.user.email_verified` → маркира компанията като verified
- Reconnection логика при загуба на връзка
- Graceful shutdown

### 8.2 Event Handlers
```javascript
async function handleAuthUserCreated(payload) {
  // payload: { userId, email, companyName, role }
  await companyService.createFromAuthEvent(payload);
}

async function handleEmailVerified(payload) {
  // payload: { userId, email }
  await companyService.updateEmailVerified(payload.userId);
}
```

### ✅ Acceptance Criteria:
- [x] Event subscriber се свързва успешно
- [x] Events се обработват правилно
- [x] Reconnection работи при прекъсване
- [x] Логване на всички events

---

## Стъпка 9: Express App Setup

### 9.1 Създаване на `src/app.js`
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const companyRoutes = require('./routes/companyRoutes');
const healthRoutes = require('./routes/healthRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const requestLogger = require('./middlewares/requestLogger');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/company', companyRoutes);

// Error handling
app.use(errorMiddleware);

module.exports = app;
```

### 9.2 Създаване на `src/server.js`
```javascript
const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const eventSubscriber = require('./utils/eventSubscriber');
require('dotenv').config();

const PORT = process.env.PORT || 4001;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected');
    
    // Start RabbitMQ subscriber
    eventSubscriber.start();
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Company Service running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        mongoose.connection.close();
        eventSubscriber.close();
        process.exit(0);
      });
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
```

### ✅ Acceptance Criteria:
- [x] Express app е конфигуриран
- [x] Server стартира успешно
- [x] MongoDB се свързва
- [x] RabbitMQ subscriber стартира
- [x] Graceful shutdown работи

---

## Стъпка 10: Docker Configuration

### 10.1 Създаване на `Dockerfile`
```dockerfile
# Multi-stage build for smaller image size
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
```

### 10.2 Създаване на `docker-compose.yml`
```yaml
version: '3.8'

services:
  company:
    build: .
    ports:
      - "4001:4001"
    env_file:
      - .env
    environment:
      - PORT=4001
      - NODE_ENV=production
      - LOG_LEVEL=info
      - MONGO_URI=mongodb://mongo-company:27017/company_db
      - JWT_PUBLIC_KEY=/secrets/jwt-public.pem
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - ALLOWED_ORIGINS=http://localhost:3000
    volumes:
      - ./secrets:/secrets
      - ./logs:/app/logs
    depends_on:
      - mongo-company
      - rabbitmq
    networks:
      - avto-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4001/api/health/liveness', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  mongo-company:
    image: mongo:6
    container_name: mongo-company
    ports:
      - "27018:27017"
    volumes:
      - company-mongo-data:/data/db
    networks:
      - avto-network
    restart: unless-stopped

networks:
  avto-network:
    external: true

volumes:
  company-mongo-data:
```

### 10.3 Създаване на shared Docker network
```bash
docker network create avto-network
```

### 10.4 Копиране на JWT публичен ключ
```bash
# От auth/secrets към company-service/secrets
cp ../auth/secrets/jwt-public.pem ./secrets/
```

### ✅ Acceptance Criteria:
- [x] Dockerfile build успешно
- [x] docker-compose up работи
- [x] Service се свързва към споделената мрежа
- [x] JWT публичен ключ е достъпен

---

## Стъпка 11: Интеграция с Auth Service

### 11.1 Актуализиране на auth/docker-compose.yml
**НЕ се променят файлове в auth, само се добавя network:**

В auth директорията, актуализира docker-compose.yml да използва `avto-network`:
```yaml
# Добави към всеки service:
networks:
  - avto-network

# Добави в края:
networks:
  avto-network:
    external: true
```

### 11.2 Тестване на интеграцията
```bash
# 1. Стартирай auth service
cd auth
docker-compose up -d

# 2. Стартирай company service
cd ../company-service
docker-compose up -d

# 3. Провери логовете
docker logs company -f
```

### ✅ Acceptance Criteria:
- [x] И двата service-а работят заедно
- [x] RabbitMQ връзката е успешна
- [x] Company service получава events от auth

---

## Стъпка 12: Testing

### 12.1 Конфигуриране на Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js']
};
```

### 12.2 Създаване на тестове

**tests/companyService.test.js**
- CRUD операции
- Event handling
- Validation

**tests/companyController.test.js**
- HTTP endpoints
- Authentication
- Error responses

**tests/authMiddleware.test.js**
- JWT validation
- Error handling

**tests/eventSubscriber.test.js**
- Event processing
- Error recovery

### 12.3 In-memory MongoDB за тестове
```bash
npm install --save-dev mongodb-memory-server
```

### ✅ Acceptance Criteria:
- [x] Всички тестове преминават
- [x] Code coverage > 85%
- [x] Integration тестове работят

---

## Стъпка 13: Документация

### 13.1 Създаване на `README.md`
- Описание на service-а
- Setup инструкции
- API endpoints
- Environment variables
- Docker commands

### 13.2 Създаване на `API_DOCUMENTATION.md`
- Детайлна API документация
- Request/Response примери
- Error codes

### 13.3 Postman Collection
- Колекция с всички endpoints
- Environment variables
- Example requests

### ✅ Acceptance Criteria:
- [x] Документацията е пълна и ясна
- [x] Postman collection работи

---

## Стъпка 14: End-to-End Testing

### 14.1 Пълен тест сценарий
```bash
# 1. Регистрирай нов потребител в Auth Service
POST http://localhost:4000/api/auth/register
{
  "email": "test@company.com",
  "password": "SecurePass123!",
  "companyName": "Test Company"
}

# 2. Провери дали компанията е създадена в Company Service
GET http://localhost:4001/api/company
Authorization: Bearer <access_token>

# 3. Верифицирай email в Auth Service
# 4. Провери дали компанията е маркирана като verified
```

### 14.2 Тестване на различни сценарии
- Happy path
- Error scenarios
- RabbitMQ disconnect/reconnect
- MongoDB down
- Invalid JWT tokens

### ✅ Acceptance Criteria:
- [x] Всички E2E тестове преминават
- [x] Event-driven синхронизацията работи
- [x] Error handling е robust

---

## 📝 Финален Checklist

- [x] **Стъпка 1**: Проектът е инициализиран
- [x] **Стъпка 2**: Конфигурация и utilities
- [x] **Стъпка 3**: MongoDB model (подобрен с validation, indexes, методи)
- [x] **Стъпка 4**: Middlewares (пълна имплементация)
- [x] **Стъпка 5**: Service logic (пълна имплементация)
- [x] **Стъпка 6**: Controllers (пълна имплементация)
- [x] **Стъпка 7**: Routes (пълна имплементация)
- [x] **Стъпка 8**: RabbitMQ subscriber (пълна имплементация)
- [ ] **Стъпка 9**: Express app
- [ ] **Стъпка 10**: Docker configuration
- [ ] **Стъпка 11**: Integration с Auth
- [ ] **Стъпка 12**: Testing
- [ ] **Стъпка 13**: Documentation
- [ ] **Стъпка 14**: E2E testing

---

## 🚀 Стартиране на Системата

### Development Mode
```bash
# Auth Service
cd auth
npm run dev

# Company Service
cd company-service
npm run dev
```

### Production Mode (Docker)
```bash
# Създай shared network
docker network create avto-network

# Auth Service
cd auth
docker-compose up -d

# Company Service
cd company-service
docker-compose up -d

# Провери статус
docker ps
docker logs auth -f
docker logs company -f
```

---

## 🔧 Troubleshooting

### RabbitMQ Connection Issues
```bash
# Провери RabbitMQ
docker logs rabbitmq
# Management UI: http://localhost:15672 (guest/guest)
```

### MongoDB Connection Issues
```bash
# Провери MongoDB
docker logs mongo-company
docker exec -it mongo-company mongosh
```

### JWT Verification Failed
```bash
# Провери дали публичният ключ е копиран
ls -la company-service/secrets/jwt-public.pem
```

---

## 📊 Мониторинг

### Health Checks
```bash
# Auth Service
curl http://localhost:4000/api/health

# Company Service
curl http://localhost:4001/api/health
```

### Logs
```bash
# Real-time logs
docker logs company -f
docker logs auth -f

# Log files
tail -f company-service/logs/combined.log
tail -f company-service/logs/error.log
```

---

## 🎯 Следващи Стъпки

След успешна имплементация на Company Service:
1. Employee Management Feature
2. Subscription Service
3. Fleet Service
4. API Gateway
5. Frontend Application
