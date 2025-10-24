# RabbitMQ Resilience & Message Durability

## Проблем
Когато `company-service` е down по време на публикуване на event от `auth` сървиса, съществува риск от загуба на данни и несинхронизирани състояния между сървисите.

## Решение

### 1. Durable Queues & Persistent Messages
- **Queue**: `company_service_queue` е конфигурирана като `durable: true`
- **Messages**: Всички съобщения се публикуват с `persistent: true`
- **Exchange**: `auth_events` exchange е също `durable: true`

Това гарантира, че:
- Опашката и съобщенията преживяват restart на RabbitMQ
- Когато `company-service` се пусне отново, всички чакащи съобщения ще бъдат обработени

### 2. Retry Mechanism (Delay Queue Pattern)

```
Main Queue → Process → Success → ACK
    ↓
  Failure
    ↓
Retry Queue (5s TTL) → Back to Main Queue → Retry
    ↓ (after 3 retries)
Dead Letter Queue (DLQ)
```

#### Компоненти:
- **Main Queue**: `company_service_queue` - основна опашка за обработка
- **Retry Queue**: `company_service_queue.retry` - временна опашка с TTL от 5 секунди
- **DLQ**: `company_service_queue.dlq` - финална опашка за непроцесируеми съобщения

#### Поведение:
1. Съобщение се получава от main queue
2. При грешка:
   - Ако `x-retry-count < 3`: Изпраща се в retry queue с `x-retry-count++`
   - След 5 секунди retry queue изпраща съобщението обратно в main queue
   - При `x-retry-count >= 3`: Съобщението се изпраща в DLQ
3. Съобщението се ACK-ва след успешна обработка или изпращане в DLQ/retry queue

### 3. Prefetch Limit
```javascript
await this.channel.prefetch(1);
```

Контролира колко съобщения се обработват едновременно:
- При crash на сървиса, unacked съобщения се връщат автоматично в опашката
- Предотвратява претоварване на сървиса

### 4. Manual Acknowledgment
```javascript
{
  noAck: false // Изисква explicit ACK за всяко съобщение
}
```

Съобщенията се ACK-ват само след успешна обработка или изпращане в retry/DLQ.

## Мониторинг

### Проверка на опашките в RabbitMQ Management UI
```
http://localhost:15672
User: guest
Pass: guest
```

### Важни метрики:
- **Ready messages**: Колко съобщения чакат обработка
- **Unacked messages**: Колко съобщения се обработват в момента
- **DLQ messages**: Колко съобщения са failed окончателно

### CLI команди:
```bash
# Провери съобщения в main queue
docker exec avto-rabbitmq rabbitmqctl list_queues name messages

# Провери съобщения в DLQ
docker exec avto-rabbitmq rabbitmqctl list_queues | grep dlq

# Провери bindings
docker exec avto-rabbitmq rabbitmqctl list_bindings
```

## Тестване на Resilience

### Сценарий 1: Company Service е DOWN при регистрация
```bash
# 1. Спри company-service
cd company-service
docker-compose down

# 2. Регистрирай потребител в auth service
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "companyName": "Test Company"
  }'

# 3. Провери че съобщението е в опашката
# Отвори RabbitMQ UI: http://localhost:15672
# Провери company_service_queue -> трябва да има 1 ready message

# 4. Пусни company-service
docker-compose up -d

# 5. Провери логовете
docker logs avto-company-service -f

# Очакван резултат:
# - Съобщението се обработва автоматично
# - Company се създава успешно
```

### Сценарий 2: Грешка при обработка
```bash
# Симулирай грешка в обработката (напр. DB connection error)
# Провери logs за retry attempts и накрая DLQ
```

## Възстановяване от DLQ

Когато съобщение попадне в DLQ, има няколко опции:

### 1. Manual Reprocessing
```bash
# Използвай RabbitMQ Management UI
# Queues -> company_service_queue.dlq -> Get Messages -> Requeue
```

### 2. Programmatic Retry (TODO)
Създаване на admin endpoint който:
- Чете съобщения от DLQ
- Поправя проблема (ако е възможно)
- Публикува отново в main queue

### 3. Analysis
Всяко DLQ съобщение има headers:
- `x-retry-count`: Колко пъти е опитано
- `x-failed-reason`: Причина за грешката
- `x-failed-at`: Кога е failed

## Best Practices

### DO:
✅ Използвай idempotent operations (проверявай дали данните вече съществуват)
✅ Log всички retry attempts
✅ Мониторирай DLQ редовно
✅ Имай Alert за DLQ messages > threshold

### DON'T:
❌ Не увеличавай retry count безкрайно
❌ Не игнорирай DLQ съобщения
❌ Не публикувай sensitive data в error messages

## Конфигурация

### Environment Variables
```env
RABBITMQ_URL=amqp://avto-rabbitmq:5672
```

### Constants (customizable)
```javascript
const maxRetries = 3;           // Максимален брой опити
const retryDelay = 5000;        // 5 секунди между retries
const prefetchLimit = 1;        // Обработвай 1 message наведнъж
```

## Допълнителни подобрения (TODO)

1. **Exponential Backoff**: Вместо фиксиран 5s delay, използвай 5s, 10s, 20s
2. **Dead Letter TTL**: Автоматично изтриване на DLQ messages след X дни
3. **Metrics & Alerting**: Prometheus metrics за queue depth, retry rates, DLQ size
4. **Circuit Breaker**: Временно спиране на message processing при persistent failures
5. **Idempotency Keys**: Гарантиране че duplicate messages не създават duplicate data

## References
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/reliability.html)
- [Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)
- [Consumer Acknowledgements](https://www.rabbitmq.com/confirms.html)
