const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General rate limiter for API endpoints
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method
    });
    res.status(429).json({
      error: {
        message: 'Too many requests, please try again later',
        retryAfter: '15 minutes'
      }
    });
  }
});

/**
 * Strict rate limiter for authentication-related endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: {
      message: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes'
    }
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(429).json({
      error: {
        message: 'Too many authentication attempts, please try again later',
        retryAfter: '15 minutes'
      }
    });
  }
});

/**
 * Create operation rate limiter
 * 20 creates per hour per IP
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: {
      message: 'Too many create requests, please try again later',
      retryAfter: '1 hour'
    }
  },
  handler: (req, res) => {
    logger.warn('Create rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(429).json({
      error: {
        message: 'Too many create requests, please try again later',
        retryAfter: '1 hour'
      }
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter
};
