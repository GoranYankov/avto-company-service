require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const eventSubscriber = require('./utils/eventSubscriber');
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
  .then(() => {
    logger.info('MongoDB connected successfully');
    
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
      server.close(() => {
        mongoose.connection.close();
        if (eventSubscriber && typeof eventSubscriber.close === 'function') {
          eventSubscriber.close();
        }
        process.exit(0);
      });
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
