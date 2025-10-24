const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../utils/customErrors');

// Load and parse JWT public key from environment
let publicKeyPem = null;
if (process.env.JWT_PUBLIC_KEY_B64) {
  try {
    const buf = Buffer.from(process.env.JWT_PUBLIC_KEY_B64, 'base64');
    publicKeyPem = buf.toString('utf8');
    logger.info('JWT public key loaded successfully from environment');
  } catch (err) {
    logger.error('Failed to parse JWT_PUBLIC_KEY_B64:', err.message);
    publicKeyPem = null;
  }
} else {
  logger.warn('JWT_PUBLIC_KEY_B64 not provided - authentication will not work in production');
}

/**
 * Authentication middleware - validates JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
  try {
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

    // In production, public key must be configured
    if (process.env.NODE_ENV === 'production' && !publicKeyPem) {
      logger.error('JWT public key not configured in production mode');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    // Verify token if public key is available
    if (publicKeyPem) {
      try {
        const payload = jwt.verify(token, publicKeyPem, { 
          algorithms: ['RS256', 'ES256', 'RS384', 'RS512'] 
        });
        
        // Attach user info to request
        req.user = {
          id: payload.userId || payload.id,
          email: payload.email,
          roles: payload.roles || [],
          companyId: payload.companyId
        };

        logger.debug('Token verified successfully', { 
          userId: req.user.id,
          email: req.user.email 
        });
        
        return next();
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
    }

    // Development fallback - only in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Using development fallback authentication', {
        ip: req.ip,
        url: req.originalUrl
      });
      
      req.user = { 
        id: 'dev-user-id', 
        email: 'dev@example.com',
        roles: ['admin'],
        companyId: 'dev-company-id'
      };
      
      return next();
    }

    // Should not reach here, but just in case
    throw new UnauthorizedError('Authentication failed');
    
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
