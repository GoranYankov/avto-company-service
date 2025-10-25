# Company Service - Event Schema

## Overview

This document describes the event schemas published by the Company Service.

## Published Events

### 1. company.deleted

Published when a company is deleted (soft delete).

**Exchange:** `company_events`  
**Routing Key:** `company.deleted`

**Payload:**
```json
{
  "event": "company.deleted",
  "service": "company-service",
  "data": {
    "companyId": "507f1f77bcf86cd799439010",
    "name": "Example Company Ltd",
    "email": "info@example.com",
    "timestamp": "2025-10-25T19:30:00.000Z"
  }
}
```

**Consumers:**
- **vehicle-service**: Marks all vehicles belonging to the deleted company as `inactive`
- **maintenance-service**: Optionally archives or marks maintenance records as inactive
- **analytics-service**: Updates aggregated statistics

**Use Case:**
When a company is soft-deleted (isActive = false), this event notifies all dependent services to handle cascading updates.

---

### 2. company.created (Future)

Published when a new company is created.

**Exchange:** `company_events`  
**Routing Key:** `company.created`

**Payload:**
```json
{
  "event": "company.created",
  "service": "company-service",
  "data": {
    "companyId": "507f1f77bcf86cd799439010",
    "name": "Example Company Ltd",
    "email": "info@example.com",
    "registrationNumber": "123456789",
    "createdBy": "507f1f77bcf86cd799439013",
    "timestamp": "2025-10-25T19:30:00.000Z"
  }
}
```

**Status:** Not yet implemented

---

### 3. company.updated (Future)

Published when a company is updated.

**Exchange:** `company_events`  
**Routing Key:** `company.updated`

**Payload:**
```json
{
  "event": "company.updated",
  "service": "company-service",
  "data": {
    "companyId": "507f1f77bcf86cd799439010",
    "name": "Example Company Ltd",
    "email": "info@example.com",
    "updatedFields": ["name", "email", "phone"],
    "timestamp": "2025-10-25T19:30:00.000Z"
  }
}
```

**Status:** Not yet implemented

---

## Event Guidelines

### Message Format

All events follow this structure:

```json
{
  "event": "event.name",
  "service": "company-service",
  "data": {
    // Event-specific payload
  }
}
```

### Headers

Events include these RabbitMQ properties:

```json
{
  "contentType": "application/json",
  "persistent": true
}
```

### Idempotency

- Consumers should implement idempotency checks using `companyId` + `timestamp`
- Duplicate events may be published in case of retries

### Error Handling

- Failed events are logged but do not block the main operation
- If RabbitMQ is unavailable, the event is dropped with a warning log
- The service continues to function without RabbitMQ

---

## Event Flow Example

### Deleting a Company

1. **User Request:** DELETE /api/company/:id
2. **Service Logic:** 
   - Validate authorization
   - Soft delete company (isActive = false)
   - Save to MongoDB
3. **Publish Event:**
   - `company.deleted` → vehicle-service, maintenance-service
4. **Consumer Actions:**
   - vehicle-service marks all company vehicles as `inactive`
   - maintenance-service optionally archives records
5. **Response:** 200 OK to client

---

## Monitoring

### Metrics to Track

- Event publish success/failure rate
- RabbitMQ connection status
- Event payload size
- Publishing latency

### Alerting

Alert when:
- RabbitMQ connection is down for > 5 minutes
- Event publish failure rate > 5%
- Event publishing latency > 1 second

---

## Testing

### Publishing Test Event

```javascript
const { publishCompanyDeleted } = require('./events/company.publisher');

const testCompany = {
  _id: '507f1f77bcf86cd799439010',
  name: 'Test Company',
  email: 'test@example.com'
};

publishCompanyDeleted(testCompany);
```

### Verifying Event Delivery

1. Check RabbitMQ Management UI at http://localhost:15672
2. Navigate to Queues → `vehicle_service_queue`
3. Click "Get messages"
4. Verify payload matches schema

---

## Migration Notes

### Before This Implementation

- ❌ company.deleted event was **not published**
- ❌ vehicle-service had a subscriber but **never received** the event
- ❌ Deleting a company did **not** cascade to vehicles

### After This Implementation

- ✅ company.deleted event is **published** on soft delete
- ✅ vehicle-service **receives and processes** the event
- ✅ Vehicles are automatically marked as `inactive` when company is deleted

---

## Configuration

### Environment Variables

No additional configuration needed. Uses existing:
- `RABBITMQ_URL` - RabbitMQ connection URL
- Existing logger configuration

### RabbitMQ Setup

Ensure the exchange exists:
```bash
# The exchange is auto-created on service startup
# Exchange: company_events
# Type: topic
# Durable: true
```

---

## Related Documentation

- [Company Service API](./API_ENDPOINTS.md)
- [RabbitMQ Resilience](./RABBITMQ_RESILIENCE.md)
- [Vehicle Service Event Subscriber](../../vehicle-service/src/utils/eventSubscriber.js)
