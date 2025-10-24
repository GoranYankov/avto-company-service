/**
 * Tests for Error Middleware
 * @jest-environment node
 */

const errorHandler = require('../src/middlewares/errorMiddleware');
const logger = require('../src/utils/logger');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require('../src/utils/customErrors');

jest.mock('../src/utils/logger');

describe('Error Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('should handle ValidationError with 400 status', () => {
    const error = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid email' }
    ]);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }]
      }
    });
  });

  test('should handle UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError('Invalid token');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Invalid token'
      }
    });
  });

  test('should handle ForbiddenError with 403 status', () => {
    const error = new ForbiddenError('Access denied');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Access denied'
      }
    });
  });

  test('should handle NotFoundError with 404 status', () => {
    const error = new NotFoundError('Company');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Company not found'
      }
    });
  });

  test('should handle ConflictError with 409 status', () => {
    const error = new ConflictError('Email already exists');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Email already exists'
      }
    });
  });

  test('should handle Mongoose validation error', () => {
    const error = {
      name: 'ValidationError',
      errors: {
        email: {
          message: 'Email is required',
          path: 'email'
        }
      }
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Email is required'
          })
        ])
      }
    });
  });

  test('should handle Mongoose duplicate key error', () => {
    const error = {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'test@example.com' }
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Duplicate field value',
        details: {
          field: 'email',
          message: 'email already exists'
        }
      }
    });
  });

  test('should handle Mongoose CastError', () => {
    const error = {
      name: 'CastError',
      path: 'id',
      value: 'invalid-id'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Invalid id: invalid-id'
      }
    });
  });

  test('should handle generic errors with 500 status in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Something went wrong');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Something went wrong'
      }
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('should expose error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Something went wrong');
    error.stack = 'Error stack trace';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Something went wrong',
        stack: 'Error stack trace'
      }
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('should log error details', () => {
    const error = new Error('Test error');

    errorHandler(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error:',
      expect.objectContaining({
        message: 'Test error',
        method: 'GET',
        url: '/test'
      })
    );
  });
});
