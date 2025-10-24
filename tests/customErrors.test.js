/**
 * Tests for Custom Errors
 * @jest-environment node
 */

const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError
} = require('../src/utils/customErrors');

describe('Custom Errors', () => {
  describe('ValidationError', () => {
    test('should create validation error with details', () => {
      const details = [{ field: 'email', message: 'Invalid' }];
      const error = new ValidationError('Validation failed', details);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    test('should create unauthorized error', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    test('should create forbidden error', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    test('should create not found error', () => {
      const error = new NotFoundError('Company');

      expect(error.message).toBe('Company not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    test('should use custom message if provided', () => {
      const error = new NotFoundError('Custom message');

      expect(error.message).toBe('Custom message not found');
    });
  });

  describe('ConflictError', () => {
    test('should create conflict error', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('InternalServerError', () => {
    test('should create internal server error', () => {
      const error = new InternalServerError('Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ServiceUnavailableError', () => {
    test('should create service unavailable error', () => {
      const error = new ServiceUnavailableError('Database down');

      expect(error.message).toBe('Database down');
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('Error inheritance', () => {
    test('should be instance of Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
    });

    test('should have stack trace', () => {
      const error = new NotFoundError('Test');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });
});
