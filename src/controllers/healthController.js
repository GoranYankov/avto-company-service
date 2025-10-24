const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Basic health check - always returns OK if service is running
 */
exports.healthCheck = (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'company-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Liveness probe - checks if application is alive
 * Used by Kubernetes/Docker to know if container should be restarted
 */
exports.liveness = (req, res) => {
  // Simple check - if we can respond, we're alive
  res.status(200).json({ status: 'alive' });
};

/**
 * Readiness probe - checks if application is ready to serve traffic
 * Checks dependencies like MongoDB and RabbitMQ
 */
exports.readiness = async (req, res) => {
  const health = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  let isReady = true;

  // Check MongoDB connection
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    health.checks.mongodb = {
      status: dbState === 1 ? 'up' : 'down',
      state: dbStatus[dbState] || 'unknown',
      responseTime: null
    };

    if (dbState === 1) {
      // Ping database to check actual connectivity
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      health.checks.mongodb.responseTime = `${Date.now() - startTime}ms`;
    } else {
      isReady = false;
    }
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
    health.checks.mongodb = {
      status: 'down',
      error: error.message
    };
    isReady = false;
  }

  // Check RabbitMQ connection
  try {
    const eventSubscriber = require('../utils/eventSubscriber');
    const rabbitmqReady = eventSubscriber.isReady();
    
    health.checks.rabbitmq = {
      status: rabbitmqReady ? 'up' : 'down',
      connected: rabbitmqReady
    };

    if (!rabbitmqReady) {
      isReady = false;
    }
  } catch (error) {
    logger.error('RabbitMQ health check failed:', error);
    health.checks.rabbitmq = {
      status: 'down',
      error: error.message
    };
    isReady = false;
  }

  // Set overall status
  health.status = isReady ? 'ready' : 'not_ready';

  // Return appropriate status code
  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json(health);
};
