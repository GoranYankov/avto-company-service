# 🏢 Company Service

The **Company Service** is a core microservice in the Fleet Management platform.  
It manages all company-related data — including company profiles, settings, employees, and subscription details — and synchronizes automatically with the Auth Service via RabbitMQ events.

This service is built with **Node.js**, **Express**, **MongoDB**, and **Mongoose**, and uses **JWT verification** (via Auth public key) for secure access control.

---

## 🚀 Features

- **Company Management**: Create, read, update, and delete company records
- **Automatic Company Creation**: Listens to `auth.user.created` events and creates new company entries
- **Employee Management (Phase 2)**: Add and manage users within a company
- **Company Settings**: Manage metadata like address, contact info, and subscription type
- **Role Validation**: Uses JWT verification with Auth Service’s public key
- **Event Consumer**: Subscribes to RabbitMQ events for synchronization with Auth Service
- **Structured Logging**: Winston logger for debug/info/error tracking
- **Health Checks**: Kubernetes-ready endpoints for liveness and readiness
- **Error Handling**: Centralized and structured
- **Request Logging**: Middleware for API request tracing

---

## 🧱 Project Structure

```
company-service/
│
├── src/
│   ├── controllers/
│   │   └── companyController.js
│   ├── services/
│   │   └── companyService.js
│   ├── models/
│   │   └── Company.js
│   ├── routes/
│   │   └── companyRoutes.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── utils/
│   │   ├── eventSubscriber.js
│   │   └── logger.js
│   ├── app.js
│   └── server.js
│
├── tests/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## ⚙️ API Endpoints

### Company Management
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/api/company` | Get all companies (admin only) |
| `GET` | `/api/company/:id` | Get single company details |
| `POST` | `/api/company` | Create a company (manual admin creation) |
| `PUT` | `/api/company/:id` | Update company information |
| `DELETE` | `/api/company/:id` | Delete company (soft delete or archive) |

### Health Checks
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/api/health` | Full health check |
| `GET` | `/api/health/liveness` | Liveness probe |
| `GET` | `/api/health/readiness` | Readiness probe |

---

## 🧩 Data Model

### Company Schema Example
```js
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    country: String
  },
  createdBy: ObjectId,
  subscription: {
    type: { type: String, enum: ["free", "standard", "premium"], default: "free" },
    expiresAt: Date
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🪝 RabbitMQ Integration

### Event Subscription
The service listens to events from the `auth_events` exchange (fanout type):

| Event | Description | Action |
|--------|--------------|--------|
| `auth.user.created` | A new user/company has been registered | Creates a company record |
| `auth.user.email_verified` | User verified email | Marks company as verified |

Example consumer:
```js
channel.consume("auth_events", (msg) => {
  const event = JSON.parse(msg.content.toString());
  if (event.type === "auth.user.created") {
    companyService.createFromAuth(event.payload);
  }
});
```

---

## 🔑 Environment Variables

See `.env.example` for configuration details:

**Required:**
```
PORT=4001
NODE_ENV=development
MONGO_URI=mongodb://mongo:27017/company_db
JWT_PUBLIC_KEY=/secrets/jwt-public.pem
RABBITMQ_URL=amqp://rabbitmq:5672
```

**Optional:**
```
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🐳 Docker Setup

Example `docker-compose.yml`:
```yaml
version: '3.8'

services:
  company:
    build: .
    ports:
      - "4001:4001"
    environment:
      - PORT=4001
      - MONGO_URI=mongodb://mongo:27017/company_db
      - JWT_PUBLIC_KEY=/secrets/jwt-public.pem
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - NODE_ENV=production
    volumes:
      - ./secrets:/secrets
    depends_on:
      - mongo
      - rabbitmq

  mongo:
    image: mongo:6
    container_name: mongo-company
    volumes:
      - company-data:/data/db
    ports:
      - "27018:27017"

volumes:
  company-data:
```

---

## ✅ Task Breakdown & Acceptance Criteria

### Task 1 — Project Initialization
- [ ] Create `company-service` folder and base Node.js project
- [ ] Setup `Express`, `Mongoose`, and `dotenv`
- [ ] Add `eslint` + `prettier`
- [ ] Add `Dockerfile` and `docker-compose.yml`
- **Acceptance Criteria:**
  - Project starts successfully with `npm run dev`
  - Accessible at `http://localhost:4001/api/health`

---

### Task 2 — Company CRUD
- [ ] Implement Mongoose model `Company.js`
- [ ] Create `companyService.js` with full CRUD logic
- [ ] Add `companyController.js` + routes
- [ ] Add JWT middleware to secure endpoints
- **Acceptance Criteria:**
  - All CRUD endpoints working
  - Only authorized users can access routes

---

### Task 3 — RabbitMQ Event Consumer
- [ ] Connect to RabbitMQ exchange `auth_events`
- [ ] Listen for `auth.user.created` and `auth.user.email_verified`
- [ ] Automatically create or update company records
- **Acceptance Criteria:**
  - When a user registers via Auth Service, company is created automatically
  - RabbitMQ reconnects on failure

---

### Task 4 — Logging & Error Handling
- [ ] Integrate Winston logger
- [ ] Add `errorMiddleware.js`
- [ ] Add structured logs for events and API calls
- **Acceptance Criteria:**
  - Logs are printed to console and saved in `/logs`
  - Errors return proper JSON responses

---

### Task 5 — Health Checks
- [ ] Implement `/api/health`, `/api/health/liveness`, `/api/health/readiness`
- [ ] Include RabbitMQ and MongoDB connection statuses
- **Acceptance Criteria:**
  - Returns 200 with status JSON when all dependencies are healthy

---

### Task 6 — Testing
- [ ] Add Jest tests for controllers and services
- [ ] Include integration test with in-memory MongoDB
- **Acceptance Criteria:**
  - `npm test` passes with >90% coverage

---

## 🧪 Test Plan

| Test Case | Expected Result |
|------------|----------------|
| Register user in Auth | `auth.user.created` event triggers company creation |
| Update company info | Company document updates in MongoDB |
| Unauthorized request | Returns `401 Unauthorized` |
| RabbitMQ down | Service retries connection gracefully |
| Health check | Returns all system components as `healthy` |

---

## 🔒 Security

- JWT validation via Auth public key
- MongoDB schema validation
- Sanitized user input
- Environment-based configuration

---

## 🧰 Future Enhancements

- Employee management (CRUD)
- Company billing / subscription service integration
- GraphQL gateway integration
- Redis caching for company lookups
