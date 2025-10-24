/**
 * Central export for all middlewares
 * Provides easy imports: const { authenticate, requireRole } = require('./middlewares');
 */

const { authenticate, optionalAuthenticate } = require('./authMiddleware');
const { 
  requireRole, 
  requireAdmin, 
  requireCompanyAdmin, 
  requireOwnershipOrAdmin 
} = require('./roleMiddleware');
const validate = require('./validationMiddleware');
const errorMiddleware = require('./errorMiddleware');
const requestLogger = require('./requestLogger');
const corsOptions = require('./corsConfig');
const { apiLimiter, authLimiter, createLimiter } = require('./rateLimiter');

module.exports = {
  // Authentication
  authenticate,
  optionalAuthenticate,
  
  // Authorization
  requireRole,
  requireAdmin,
  requireCompanyAdmin,
  requireOwnershipOrAdmin,
  
  // Validation
  validate,
  
  // Error handling
  errorMiddleware,
  
  // Logging
  requestLogger,
  
  // CORS
  corsOptions,
  
  // Rate limiting
  apiLimiter,
  authLimiter,
  createLimiter
};
