const amqplib = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;
let isConnected = false;

/**
 * Initialize RabbitMQ connection with retry logic
 * @param {string} rabbitUrl - RabbitMQ connection URL
 * @param {number} maxRetries - Maximum number of connection attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 */
async function initRabbit(rabbitUrl, maxRetries = 5, retryDelay = 5000) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      connection = await amqplib.connect(rabbitUrl);
      channel = await connection.createChannel();
      
      // Assert company_events exchange
      await channel.assertExchange('company_events', 'topic', { durable: true });
      
      isConnected = true;
      
      // Handle connection events
      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        isConnected = false;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        isConnected = false;
      });

      logger.info('Connected to RabbitMQ successfully');
      return;
    } catch (err) {
      attempts++;
      logger.error(`Failed to connect to RabbitMQ (attempt ${attempts}/${maxRetries})`, {
        error: err.message
      });
      
      if (attempts >= maxRetries) {
        logger.error('Max RabbitMQ connection attempts reached');
        throw new Error('Failed to connect to RabbitMQ after multiple attempts');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Publish a message to RabbitMQ
 * @param {string} routingKey - Routing key for the message
 * @param {Object} message - Message payload
 */
function publish(routingKey, message) {
  if (!channel || !isConnected) {
    logger.warn('RabbitMQ channel not initialized, dropping message', { routingKey });
    return;
  }

  try {
    const payload = Buffer.from(JSON.stringify(message));
    const published = channel.publish('company_events', routingKey, payload, { 
      persistent: true,
      contentType: 'application/json'
    });

    if (!published) {
      logger.warn('Message could not be published (buffer full)', { routingKey });
    } else {
      logger.debug('Message published successfully', { 
        routingKey, 
        event: message.event 
      });
    }
  } catch (err) {
    logger.error('Failed to publish message', { 
      routingKey, 
      error: err.message 
    });
  }
}

/**
 * Get connection status
 * @returns {boolean} Whether RabbitMQ is connected
 */
function getConnectionStatus() {
  return isConnected;
}

/**
 * Close RabbitMQ connection gracefully
 */
async function close() {
  try {
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ connection closed');
    }
    isConnected = false;
  } catch (err) {
    logger.error('Error closing RabbitMQ connection', { error: err.message });
  }
}

module.exports = { initRabbit, publish, getConnectionStatus, close };
