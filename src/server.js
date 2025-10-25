require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const eventSubscriber = require('./utils/eventSubscriber');
const { initRabbit, close: closeRabbitMQ } = require('./utils/rabbitmq');
const validateEnv = require('./config/validateEnv');

// Validate environment variables before starting
try {
  logger.info('Starting environment validation...');
  validateEnv();
  logger.info('Environment validation passed successfully');
} catch (error) {
  logger.error('Environment validation failed:', error.message);
  process.exit(1);
}

const PORT = process.env.PORT || 4001;

logger.info('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info('MongoDB connected successfully');
    
    // Initialize RabbitMQ for publishing
    logger.info('Initializing RabbitMQ publisher...');
    try {
      await initRabbit(process.env.RABBITMQ_URL || 'amqp://localhost');
      logger.info('RabbitMQ publisher initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ publisher:', error);
      // Continue without RabbitMQ - service can still work
    }
    
    logger.info('Starting RabbitMQ subscriber...');
    // Start RabbitMQ subscriber (noop placeholder until implemented)
    if (eventSubscriber && typeof eventSubscriber.start === 'function') {
      eventSubscriber.start();
    }
    
    logger.info('Starting Express server...');
    const server = app.listen(PORT, () => {
      logger.info(`Company Service running on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        if (eventSubscriber && typeof eventSubscriber.close === 'function') {
          await eventSubscriber.close();
        }
        
        await closeRabbitMQ();
        logger.info('RabbitMQ connections closed');
        
        process.exit(0);
      });
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
