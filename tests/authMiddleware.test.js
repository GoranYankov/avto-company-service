/**
 * Tests for authentication middleware
 * @jest-environment node
 */

const { authenticate, optionalAuthenticate } = require('../src/middlewares/authMiddleware');
const { UnauthorizedError } = require('../src/utils/customErrors');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      ip: '127.0.0.1',
      originalUrl: '/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    test('should fail without Authorization header', () => {
      authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('should fail with invalid Authorization format', () => {
      req.headers.authorization = 'InvalidFormat token';
      authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('should fail with Bearer but no token', () => {
      req.headers.authorization = 'Bearer ';
      authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('should succeed in development mode without JWT key', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.headers.authorization = 'Bearer fake-token';
      authenticate(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('dev-user-id');
      expect(next).toHaveBeenCalledWith();
      
      process.env.NODE_ENV = originalEnv;
    });

    // TODO: Add tests with actual JWT verification when publicKeyPem is available
  });

  describe('optionalAuthenticate', () => {
    test('should continue without Authorization header', () => {
      optionalAuthenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    test('should authenticate if header is present', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.headers.authorization = 'Bearer fake-token';
      optionalAuthenticate(req, res, next);
      
      expect(req.user).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
