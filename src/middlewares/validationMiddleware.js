const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/customErrors');
const logger = require('../utils/logger');

/**
 * Validation middleware - checks express-validator results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails
    });

    throw new ValidationError('Validation failed', errorDetails);
  }

  next();
};

module.exports = validate;
