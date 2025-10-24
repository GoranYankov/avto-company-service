# Company Service

Микросървис за управление на компании в Fleet Management системата.

## 🚀 Features

- ✅ JWT Authentication с RS256
- ✅ Role-based Access Control (RBAC)
- ✅ Rate Limiting
- ✅ Request Validation
- ✅ Comprehensive Error Handling
- ✅ Request Logging
- ✅ MongoDB Integration
- ✅ RabbitMQ Event Subscriber (planned)
- ✅ Docker Support
- ✅ Health Checks

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6+
- RabbitMQ 3+ (за event-driven communication)
- JWT public key от Auth Service

## 🛠️ Setup

### 1. Копирай JWT Public Key

```bash
# От auth/secrets към company-service/secrets
cp ../auth/secrets/jwt-public.pem ./secrets/
# Или конвертирай в base64 за environment variable
```

### 2. Конфигурирай Environment

```bash
cp .env.example .env
# Редактирай .env с правилните стойности
```

### 3. Инсталирай Dependencies

```bash
npm install
```

### 4. Стартирай в Development Mode

```powershell
cd company-service
npm run dev
```

## 📚 Documentation

- [Middlewares Documentation](docs/MIDDLEWARES.md)
- [Utilities Documentation](docs/UTILITIES.md)
- [Implementation Steps](IMPLEMENTATION_STEPS.md)

## 🔧 Available Scripts

- `npm start` - Стартира production server
- `npm run dev` - Стартира development server
- `npm test` - Пуска тестовете
- `npm run lint` - Проверка на кода с ESLint
- `npm run lint:fix` - Автоматична корекция на ESLint грешки

## 🌐 API Endpoints

### Health Checks
- `GET /api/health` - General health check
- `GET /api/health/liveness` - Liveness probe
- `GET /api/health/readiness` - Readiness probe

### Companies (Coming Soon)
- `POST /api/company` - Create company
- `GET /api/company` - Get all companies
- `GET /api/company/:id` - Get company by ID
- `PUT /api/company/:id` - Update company
- `DELETE /api/company/:id` - Delete company

## 🔐 Security

### Authentication
Всички защитени endpoints изискват JWT токен в Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Rate Limiting
- General API: 100 requests / 15 min / IP
- Auth endpoints: 5 requests / 15 min / IP
- Create operations: 20 requests / 1 hour / IP
