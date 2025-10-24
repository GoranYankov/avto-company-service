/**
 * Tests for Company Service
 * @jest-environment node
 */

const companyService = require('../src/services/companyService');
const Company = require('../src/models/Company');
const { NotFoundError, ConflictError } = require('../src/utils/customErrors');

// Mock the Company model
jest.mock('../src/models/Company');
jest.mock('../src/utils/logger');

describe('CompanyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    const mockCompanyData = {
      name: 'Test Company',
      email: 'test@company.com',
      phone: '+1234567890'
    };
    const userId = 'user123';

    test('should create a company successfully', async () => {
      Company.findOne.mockResolvedValue(null);
      Company.create.mockResolvedValue({
        _id: 'company123',
        ...mockCompanyData,
        createdBy: userId
      });

      const result = await companyService.createCompany(mockCompanyData, userId);

      expect(Company.findOne).toHaveBeenCalledWith({
        email: mockCompanyData.email,
        isActive: true
      });
      expect(Company.create).toHaveBeenCalledWith({
        ...mockCompanyData,
        createdBy: userId
      });
      expect(result.email).toBe(mockCompanyData.email);
    });

    test('should throw ConflictError if company exists', async () => {
      Company.findOne.mockResolvedValue({ email: mockCompanyData.email });

      await expect(
        companyService.createCompany(mockCompanyData, userId)
      ).rejects.toThrow(ConflictError);
    });

    test('should handle duplicate key error', async () => {
      Company.findOne.mockResolvedValue(null);
      Company.create.mockRejectedValue({ code: 11000 });

      await expect(
        companyService.createCompany(mockCompanyData, userId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('createFromAuthEvent', () => {
    const payload = {
      userId: 'user123',
      email: 'auth@company.com',
      companyName: 'Auth Company'
    };

    test('should create company from auth event', async () => {
      Company.findOne.mockResolvedValue(null);
      Company.create.mockResolvedValue({
        _id: 'company123',
        name: payload.companyName,
        email: payload.email,
        createdBy: payload.userId
      });

      const result = await companyService.createFromAuthEvent(payload);

      expect(Company.findOne).toHaveBeenCalledWith({ createdBy: payload.userId });
      expect(result.email).toBe(payload.email);
    });

    test('should return existing company if already exists', async () => {
      const existingCompany = { _id: 'existing123', name: 'Existing' };
      Company.findOne.mockResolvedValue(existingCompany);

      const result = await companyService.createFromAuthEvent(payload);

      expect(result).toBe(existingCompany);
      expect(Company.create).not.toHaveBeenCalled();
    });
  });

  describe('getCompanyById', () => {
    test('should return company if exists and active', async () => {
      const mockCompany = {
        _id: 'company123',
        name: 'Test',
        isActive: true
      };
      Company.findById.mockResolvedValue(mockCompany);

      const result = await companyService.getCompanyById('company123');

      expect(result).toBe(mockCompany);
    });

    test('should throw NotFoundError if company does not exist', async () => {
      Company.findById.mockResolvedValue(null);

      await expect(
        companyService.getCompanyById('company123')
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw NotFoundError if company is inactive', async () => {
      Company.findById.mockResolvedValue({ isActive: false });

      await expect(
        companyService.getCompanyById('company123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateCompany', () => {
    const companyId = 'company123';
    const userId = 'user123';
    const updateData = { name: 'Updated Name' };

    test('should update company successfully', async () => {
      const mockCompany = {
        _id: companyId,
        name: 'Old Name',
        email: 'test@company.com',
        isActive: true,
        save: jest.fn()
      };
      Company.findById.mockResolvedValue(mockCompany);

      const result = await companyService.updateCompany(companyId, updateData, userId);

      expect(mockCompany.save).toHaveBeenCalled();
      expect(mockCompany.name).toBe(updateData.name);
    });

    test('should throw ConflictError if new email already exists', async () => {
      const mockCompany = {
        _id: companyId,
        email: 'old@company.com',
        isActive: true
      };
      Company.findById.mockResolvedValue(mockCompany);
      Company.findOne.mockResolvedValue({ _id: 'other123' });

      await expect(
        companyService.updateCompany(companyId, { email: 'new@company.com' }, userId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteCompany', () => {
    test('should soft delete company', async () => {
      const mockCompany = {
        _id: 'company123',
        isActive: true,
        save: jest.fn()
      };
      Company.findById.mockResolvedValue(mockCompany);

      await companyService.deleteCompany('company123', 'user123');

      expect(mockCompany.isActive).toBe(false);
      expect(mockCompany.save).toHaveBeenCalled();
    });
  });

  describe('getAllCompanies', () => {
    test('should return paginated companies', async () => {
      const mockCompanies = [
        { _id: '1', name: 'Company 1' },
        { _id: '2', name: 'Company 2' }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCompanies)
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(25);

      const result = await companyService.getAllCompanies({}, { page: 1, limit: 10 });

      expect(result.companies).toEqual(mockCompanies);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(3);
    });
  });

  describe('isOwner', () => {
    test('should return true if user owns company', async () => {
      Company.findOne.mockResolvedValue({ _id: 'company123' });

      const result = await companyService.isOwner('company123', 'user123');

      expect(result).toBe(true);
    });

    test('should return false if user does not own company', async () => {
      Company.findOne.mockResolvedValue(null);

      const result = await companyService.isOwner('company123', 'user123');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return company statistics', async () => {
      Company.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95)  // active
        .mockResolvedValueOnce(80); // verified

      Company.aggregate.mockResolvedValue([
        { _id: 'free', count: 60 },
        { _id: 'premium', count: 20 }
      ]);

      const result = await companyService.getStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(95);
      expect(result.verified).toBe(80);
      expect(result.subscriptions.free).toBe(60);
      expect(result.subscriptions.premium).toBe(20);
    });
  });
});
