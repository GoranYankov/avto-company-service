/**
 * Tests for Role Middleware
 * @jest-environment node
 */

const {
  requireRole,
  requireAdmin,
  requireCompanyAdmin,
  requireOwnershipOrAdmin
} = require('../src/middlewares/roleMiddleware');
const { ForbiddenError, UnauthorizedError } = require('../src/utils/customErrors');

describe('RoleMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      params: {},
      body: {},
      ip: '127.0.0.1',
      originalUrl: '/test'
    };
    res = {};
    next = jest.fn();
  });

  describe('requireRole', () => {
    test('should allow user with required role', () => {
      req.user = { id: 'user123', roles: ['admin'] };
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should allow user with one of multiple required roles', () => {
      req.user = { id: 'user123', roles: ['company_admin'] };
      const middleware = requireRole(['admin', 'company_admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject user without required role', () => {
      req.user = { id: 'user123', roles: ['user'] };
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    test('should reject if user has no roles', () => {
      req.user = { id: 'user123', roles: [] };
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    test('should reject if user is not authenticated', () => {
      req.user = null;
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('requireAdmin', () => {
    test('should allow admin user', () => {
      req.user = { id: 'user123', roles: ['admin'] };
      const middleware = requireAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject non-admin user', () => {
      req.user = { id: 'user123', roles: ['user'] };
      const middleware = requireAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireCompanyAdmin', () => {
    test('should allow admin', () => {
      req.user = { id: 'user123', roles: ['admin'] };
      const middleware = requireCompanyAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should allow company_admin', () => {
      req.user = { id: 'user123', roles: ['company_admin'] };
      const middleware = requireCompanyAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject regular user', () => {
      req.user = { id: 'user123', roles: ['user'] };
      const middleware = requireCompanyAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireOwnershipOrAdmin', () => {
    test('should allow admin regardless of ownership', () => {
      req.user = { id: 'user123', roles: ['admin'] };
      req.params.id = 'otherUser';
      const middleware = requireOwnershipOrAdmin('id');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should allow owner', () => {
      req.user = { id: 'user123', roles: ['user'] };
      req.params.id = 'user123';
      const middleware = requireOwnershipOrAdmin('id');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject non-owner non-admin', () => {
      req.user = { id: 'user123', roles: ['user'] };
      req.params.id = 'otherUser';
      const middleware = requireOwnershipOrAdmin('id');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    test('should check custom field', () => {
      req.user = { id: 'user123', roles: ['user'] };
      req.params.userId = 'user123';
      const middleware = requireOwnershipOrAdmin('userId');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should check body field if not in params', () => {
      req.user = { id: 'user123', roles: ['user'] };
      req.body.createdBy = 'user123';
      const middleware = requireOwnershipOrAdmin('createdBy');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
