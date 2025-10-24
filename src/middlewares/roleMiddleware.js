const logger = require('../utils/logger');
const { ForbiddenError, UnauthorizedError } = require('../utils/customErrors');

/**
 * Role-based access control middleware
 * Checks if authenticated user has one of the required roles
 * @param {string[]} allowedRoles - Array of allowed role names
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn('Role check failed - user not authenticated', {
          url: req.originalUrl,
          ip: req.ip
        });
        throw new UnauthorizedError('Authentication required');
      }

      // Get user roles
      const userRoles = req.user.roles || [];

      // Check if user has at least one of the required roles
      const hasRequiredRole = allowedRoles.some(role => 
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.id,
          userRoles,
          requiredRoles: allowedRoles,
          url: req.originalUrl
        });
        throw new ForbiddenError('Insufficient permissions');
      }

      logger.debug('Role check passed', {
        userId: req.user.id,
        userRoles,
        requiredRoles: allowedRoles
      });

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Checks if user is an admin
 * Shorthand for requireRole(['admin'])
 */
const requireAdmin = () => requireRole(['admin']);

/**
 * Checks if user is a company admin or higher
 */
const requireCompanyAdmin = () => requireRole(['admin', 'company_admin']);

/**
 * Checks if user owns the resource or is an admin
 * Compares req.user.id with specified field in req.params or req.body
 * @param {string} field - Field name to check ownership (default: 'id')
 */
const requireOwnershipOrAdmin = (field = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRoles = req.user.roles || [];
      const isAdmin = userRoles.includes('admin');

      // Admins can access everything
      if (isAdmin) {
        return next();
      }

      // Check ownership
      const resourceId = req.params[field] || req.body[field];
      const isOwner = req.user.id === resourceId;

      if (!isOwner) {
        logger.warn('Access denied - not resource owner', {
          userId: req.user.id,
          resourceId,
          field
        });
        throw new ForbiddenError('Access denied');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireCompanyAdmin,
  requireOwnershipOrAdmin
};
