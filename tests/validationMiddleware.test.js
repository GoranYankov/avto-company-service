/**
 * Tests for Validation Middleware
 * @jest-environment node
 */

const validate = require('../src/middlewares/validationMiddleware');
const { validationResult } = require('express-validator');
const { ValidationError } = require('../src/utils/customErrors');

jest.mock('express-validator');

describe('ValidationMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/test',
      method: 'POST'
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('should call next if no validation errors', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    validate(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('should throw ValidationError if there are validation errors', () => {
    const mockErrors = [
      { path: 'email', msg: 'Email is required', value: '' },
      { path: 'name', msg: 'Name is too short', value: 'A' }
    ];

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    });

    expect(() => validate(req, res, next)).toThrow(ValidationError);
  });

  test('should format error details correctly', () => {
    const mockErrors = [
      { path: 'email', msg: 'Invalid email', value: 'notanemail' }
    ];

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    });

    try {
      validate(req, res, next);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([
        {
          field: 'email',
          message: 'Invalid email',
          value: 'notanemail'
        }
      ]);
    }
  });

  test('should handle errors with param field instead of path', () => {
    const mockErrors = [
      { param: 'userId', msg: 'Invalid ID', value: 'abc' }
    ];

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    });

    try {
      validate(req, res, next);
    } catch (error) {
      expect(error.details[0].field).toBe('userId');
    }
  });
});
