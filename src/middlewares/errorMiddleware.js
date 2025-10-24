const logger = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    const field = Object.keys(err.keyPattern)[0];
    details = { field, message: `${field} already exists` };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Internal server error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode,
      url: req.originalUrl,
      method: req.method
    });
  }

  // Send response
  const response = {
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
    }
  };

  res.status(statusCode).json(response);
};
