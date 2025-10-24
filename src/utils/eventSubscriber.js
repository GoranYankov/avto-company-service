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
   * Setup exchange and queue
   */
  async setupExchangeAndQueue() {
    const exchangeName = 'auth_events';
    const queueName = 'company_service_queue';

    try {
      // Assert exchange - using same type as auth service (topic)
      await this.channel.assertExchange(exchangeName, 'topic', { durable: true });

      // Assert queue
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind queue to exchange with routing keys for auth events
      await this.channel.bindQueue(queueName, exchangeName, 'auth.user.*'); // Listen to all auth user events

      logger.info(`Queue ${queueName} bound to exchange ${exchangeName}`);
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

    try {
      await this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
          const content = msg.content.toString();
          const event = JSON.parse(content);

          logger.info('Received event:', { 
            eventType: event.eventType, 
            timestamp: event.timestamp 
          });

          await this.handleEvent(event);

          // Acknowledge message
          this.channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', error);
          // Reject and requeue the message
          this.channel.nack(msg, false, true);
        }
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
