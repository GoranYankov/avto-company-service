const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../utils/customErrors');

/**
 * Authentication middleware - validates JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
  try {
    // Validate JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
    }

    // Extract Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid Authorization header', {
        ip: req.ip,
        url: req.originalUrl
      });
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7).trim();
    
    if (!token) {
      logger.warn('Empty token provided', {
        ip: req.ip,
        url: req.originalUrl
      });
      throw new UnauthorizedError('Missing or invalid authorization token');
    }

    // Verify token with shared JWT_SECRET using HS256
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { 
        algorithms: ['HS256'] 
      });
      
      // Attach user info to request
      // Support both 'sub' and 'userId' fields for compatibility
      req.user = {
        id: payload.sub || payload.userId || payload.id,
        email: payload.email,
        role: payload.role,
        roles: payload.roles || (payload.role ? [payload.role] : []),
        companyId: payload.companyId
      };

      logger.debug('Token verified successfully', { 
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
      
      next();
    } catch (err) {
      logger.warn('JWT verification failed', {
        error: err.message,
        ip: req.ip,
        url: req.originalUrl
      });
      
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * Useful for endpoints that work both with and without authentication
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If header exists, use regular authenticate
  authenticate(req, res, next);
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
