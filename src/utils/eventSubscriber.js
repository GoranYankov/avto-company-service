const amqp = require('amqplib');
const logger = require('./logger');
const companyService = require('../services/companyService');

class EventSubscriber {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Start the event subscriber
   */
  async start() {
    if (!process.env.RABBITMQ_URL) {
      logger.warn('RABBITMQ_URL not configured, event subscriber disabled');
      return;
    }

    try {
      await this.connect();
      await this.setupExchangeAndQueue();
      await this.consumeMessages();
      this.reconnectAttempts = 0;
      logger.info('Event subscriber started successfully');
    } catch (error) {
      logger.error('Failed to start event subscriber:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Setup exchange and queue with retry mechanism
   */
  async setupExchangeAndQueue() {
    const exchangeName = 'auth_events';
    const queueName = 'company_service_queue';
    const retryQueueName = 'company_service_queue.retry';
    const dlqName = 'company_service_queue.dlq';
    const retryExchangeName = 'company_service_queue.retry_exchange';

    try {
      // Assert main exchange - using same type as auth service (topic)
      await this.channel.assertExchange(exchangeName, 'topic', { durable: true });

      // Setup retry exchange (direct)
      await this.channel.assertExchange(retryExchangeName, 'direct', { durable: true });

      // Setup retry queue with TTL - messages expire and go back to main queue
      await this.channel.assertQueue(retryQueueName, { 
        durable: true,
        messageTtl: 5000, // 5 seconds retry delay
        deadLetterExchange: '', // Use default exchange
        deadLetterRoutingKey: queueName // Route back to main queue
      });

      // Bind retry queue to retry exchange
      await this.channel.bindQueue(retryQueueName, retryExchangeName, 'retry');

      // Setup Dead Letter Queue (final resting place for failed messages)
      await this.channel.assertQueue(dlqName, { 
        durable: true
      });

      // Assert main queue
      await this.channel.assertQueue(queueName, { 
        durable: true
      });

      // Bind main queue to exchange with routing keys for auth events
      await this.channel.bindQueue(queueName, exchangeName, 'auth.user.*');

      // Set prefetch to control how many messages are processed concurrently
      // This ensures that if the service crashes, unacked messages return to queue
      await this.channel.prefetch(1); // Process one message at a time

      logger.info(`Queue ${queueName} bound to exchange ${exchangeName} with retry queue ${retryQueueName} and DLQ ${dlqName}`);
    } catch (error) {
      logger.error('Failed to setup exchange and queue:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async consumeMessages() {
    const queueName = 'company_service_queue';
    const retryQueueName = 'company_service_queue.retry';
    const retryExchangeName = 'company_service_queue.retry_exchange';
    const dlqName = 'company_service_queue.dlq';

    try {
      await this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        let event = null;
        let eventType = 'unknown';

        try {
          const content = msg.content.toString();
          event = JSON.parse(content);
          eventType = event.eventType || 'unknown';

          logger.info('Received event:', { 
            eventType: eventType, 
            timestamp: event.timestamp 
          });

          await this.handleEvent(event);

          // Acknowledge message only after successful processing
          this.channel.ack(msg);
          logger.debug('Message acknowledged', { eventType: eventType });
        } catch (error) {
          logger.error('Error processing message:', error);
          
          // Get retry count from message headers
          const headers = msg.properties.headers || {};
          const retryCount = headers['x-retry-count'] || 0;
          const maxRetries = 3;

          if (retryCount >= maxRetries) {
            // Max retries reached, send to DLQ
            logger.error(`Max retries (${maxRetries}) reached, sending to DLQ`, {
              eventType: eventType,
              retryCount,
              error: error.message
            });
            
            // Send to DLQ
            this.channel.sendToQueue(dlqName, msg.content, {
              persistent: true,
              headers: {
                ...headers,
                'x-retry-count': retryCount,
                'x-failed-reason': error.message,
                'x-failed-at': new Date().toISOString()
              }
            });
            
            // Acknowledge original message
            this.channel.ack(msg);
          } else {
            // Send to retry queue with incremented counter
            logger.warn(`Sending message to retry queue (attempt ${retryCount + 1}/${maxRetries})`, {
              eventType: eventType
            });
            
            this.channel.publish(
              retryExchangeName,
              'retry',
              msg.content,
              {
                persistent: true,
                headers: {
                  ...headers,
                  'x-retry-count': retryCount + 1
                }
              }
            );
            
            // Acknowledge original message (it's now in retry queue)
            this.channel.ack(msg);
          }
        }
      }, {
        noAck: false // Manual acknowledgment
      });

      logger.info('Started consuming messages from queue');
    } catch (error) {
      logger.error('Failed to consume messages:', error);
      throw error;
    }
  }

  /**
   * Handle incoming events
   */
  async handleEvent(event) {
    const { eventType, data } = event;

    try {
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;

        case 'user.email_verified':
          await this.handleEmailVerified(data);
          break;

        default:
          logger.debug('Unhandled event type:', eventType);
      }
    } catch (error) {
      logger.error(`Failed to handle event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Handle user created event
   */
  async handleUserCreated(data) {
    logger.info('Processing user.created event', { userId: data.userId });

    try {
      await companyService.createFromAuthEvent(data);
      logger.info('Company created from auth event', { userId: data.userId });
    } catch (error) {
      logger.error('Failed to create company from auth event:', error);
      throw error;
    }
  }

  /**
   * Handle email verified event
   */
  async handleEmailVerified(data) {
    logger.info('Processing email.verified event', { userId: data.userId });

    try {
      await companyService.updateEmailVerified(data.userId);
      logger.info('Company email verified', { userId: data.userId });
    } catch (error) {
      logger.error('Failed to update email verification:', error);
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ...');
      this.start();
    }, delay);
  }

  /**
   * Close connections gracefully
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.info('Event subscriber closed');
    } catch (error) {
      logger.error('Error closing event subscriber:', error);
    }
  }

  /**
   * Check if subscriber is connected
   */
  isReady() {
    return this.isConnected;
  }
}

module.exports = new EventSubscriber();
