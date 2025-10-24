/**
 * Tests for Company Controller
 * @jest-environment node
 */

const companyService = require('../src/services/companyService');
const { ForbiddenError, NotFoundError } = require('../src/utils/customErrors');

// Mock the service
jest.mock('../src/services/companyService');

// Mock asyncHandler to pass through the function directly
jest.mock('../src/utils/asyncHandler', () => (fn) => fn);

const companyController = require('../src/controllers/companyController');

describe('CompanyController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 'user123', roles: ['admin'] },
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    test('should create company successfully', async () => {
      const companyData = { name: 'Test Company', email: 'test@company.com' };
      const createdCompany = { _id: 'company123', ...companyData };
      
      req.body = companyData;
      companyService.createCompany.mockResolvedValue(createdCompany);

      await companyController.createCompany(req, res);

      expect(companyService.createCompany).toHaveBeenCalledWith(companyData, 'user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdCompany
      });
    });
  });

  describe('getAllCompanies', () => {
    test('should return all companies with pagination', async () => {
      const mockResult = {
        companies: [{ _id: '1', name: 'Company 1' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };

      req.query = { page: '1', limit: '10' };
      companyService.getAllCompanies.mockResolvedValue(mockResult);

      await companyController.getAllCompanies(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.companies,
        pagination: mockResult.pagination
      });
    });

    test('should apply filters from query params', async () => {
      req.query = { isActive: 'true', isVerified: 'false' };
      companyService.getAllCompanies.mockResolvedValue({
        companies: [],
        pagination: {}
      });

      await companyController.getAllCompanies(req, res);

      expect(companyService.getAllCompanies).toHaveBeenCalledWith(
        { isActive: 'true', isVerified: 'false' },
        expect.any(Object)
      );
    });
  });

  describe('getCompanyById', () => {
    test('should return company if user is owner', async () => {
      const mockCompany = {
        _id: 'company123',
        name: 'Test',
        createdBy: { toString: () => 'user123' }
      };

      req.params.id = 'company123';
      req.user.roles = ['user'];
      companyService.getCompanyById.mockResolvedValue(mockCompany);

      await companyController.getCompanyById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompany
      });
    });

    test('should return company if user is admin', async () => {
      const mockCompany = {
        _id: 'company123',
        name: 'Test',
        createdBy: { toString: () => 'otherUser' }
      };

      req.params.id = 'company123';
      req.user.roles = ['admin'];
      companyService.getCompanyById.mockResolvedValue(mockCompany);

      await companyController.getCompanyById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should call next with ForbiddenError if user is not owner or admin', async () => {
      const mockCompany = {
        _id: 'company123',
        createdBy: { toString: () => 'otherUser' }
      };

      req.params.id = 'company123';
      req.user.id = 'user123';
      req.user.roles = ['user'];
      companyService.getCompanyById.mockResolvedValue(mockCompany);

      // Use try-catch since asyncHandler wraps the function
      try {
        await companyController.getCompanyById(req, res);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('updateCompany', () => {
    test('should update company if user is owner', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedCompany = { _id: 'company123', ...updateData };

      req.params.id = 'company123';
      req.body = updateData;
      req.user.roles = ['user'];
      companyService.isOwner.mockResolvedValue(true);
      companyService.updateCompany.mockResolvedValue(updatedCompany);

      await companyController.updateCompany(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedCompany
      });
    });

    test('should remove protected fields for non-admin users', async () => {
      req.params.id = 'company123';
      req.body = { name: 'New Name', isVerified: true, createdBy: 'hacker' };
      req.user.roles = ['user'];
      companyService.isOwner.mockResolvedValue(true);
      companyService.updateCompany.mockResolvedValue({});

      await companyController.updateCompany(req, res);

      expect(req.body.isVerified).toBeUndefined();
      expect(req.body.createdBy).toBeUndefined();
    });

    test('should call next with ForbiddenError if user is not owner or admin', async () => {
      req.params.id = 'company123';
      req.user.roles = ['user'];
      companyService.isOwner.mockResolvedValue(false);

      try {
        await companyController.updateCompany(req, res);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('deleteCompany', () => {
    test('should delete company successfully', async () => {
      req.params.id = 'company123';
      companyService.deleteCompany.mockResolvedValue({});

      await companyController.deleteCompany(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company deleted successfully'
      });
    });
  });

  describe('getMyCompanies', () => {
    test('should return user companies', async () => {
      const mockCompanies = [
        { _id: '1', name: 'My Company 1' },
        { _id: '2', name: 'My Company 2' }
      ];

      companyService.getCompaniesByCreator.mockResolvedValue(mockCompanies);

      await companyController.getMyCompanies(req, res);

      expect(companyService.getCompaniesByCreator).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompanies
      });
    });
  });

  describe('getStats', () => {
    test('should return company statistics', async () => {
      const mockStats = {
        total: 100,
        active: 95,
        verified: 80,
        subscriptions: { free: 60, premium: 20 }
      };

      companyService.getStats.mockResolvedValue(mockStats);

      await companyController.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });
});
