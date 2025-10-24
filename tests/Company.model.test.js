/**
 * Tests for Company Model
 * @jest-environment node
 */

const mongoose = require('mongoose');
const Company = require('../src/models/Company');

describe('Company Model', () => {
  describe('Schema Validation', () => {
    test('should create company with valid data', () => {
      const validData = {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+359 888 123 456',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'free',
          maxVehicles: 5
        }
      };

      const company = new Company(validData);
      const error = company.validateSync();
      expect(error).toBeUndefined();
    });

    test('should fail without required name', () => {
      const company = new Company({
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId()
      });

      const error = company.validateSync();
      expect(error.errors.name).toBeDefined();
    });

    test('should fail without required email', () => {
      const company = new Company({
        name: 'Test Company',
        createdBy: new mongoose.Types.ObjectId()
      });

      const error = company.validateSync();
      expect(error.errors.email).toBeDefined();
    });

    test('should fail with invalid email format', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'invalid-email',
        createdBy: new mongoose.Types.ObjectId()
      });

      const error = company.validateSync();
      expect(error.errors.email).toBeDefined();
    });

    test('should fail with short name', () => {
      const company = new Company({
        name: 'A',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId()
      });

      const error = company.validateSync();
      expect(error.errors.name).toBeDefined();
    });

    test('should fail with invalid phone format', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        phone: 'invalid-phone!@#',
        createdBy: new mongoose.Types.ObjectId()
      });

      const error = company.validateSync();
      expect(error.errors.phone).toBeDefined();
    });
  });

  describe('Virtual Properties', () => {
    test('should return active subscription status for free plan', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'free',
          maxVehicles: 5
        }
      });

      expect(company.subscriptionStatus).toBe('active');
    });

    test('should return unlimited for premium without expiry', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'premium',
          maxVehicles: 100
        }
      });

      expect(company.subscriptionStatus).toBe('unlimited');
    });

    test('should return active for non-expired subscription', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'premium',
          maxVehicles: 100,
          expiresAt: futureDate
        }
      });

      expect(company.subscriptionStatus).toBe('active');
    });

    test('should return expired for past expiry date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'premium',
          maxVehicles: 100,
          expiresAt: pastDate
        }
      });

      expect(company.subscriptionStatus).toBe('expired');
    });
  });

  describe('Instance Methods', () => {
    test('isSubscriptionActive should return true for active subscription', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'premium',
          expiresAt: futureDate
        }
      });

      expect(company.isSubscriptionActive()).toBe(true);
    });

    test('isSubscriptionActive should return false for expired subscription', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'premium',
          expiresAt: pastDate
        }
      });

      expect(company.isSubscriptionActive()).toBe(false);
    });

    test('isSubscriptionActive should return true for free plan', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId(),
        subscription: {
          type: 'free'
        }
      });

      expect(company.isSubscriptionActive()).toBe(true);
    });
  });

  describe('Default Values', () => {
    test('should set default values', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'test@company.com',
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(company.isActive).toBe(true);
      expect(company.isVerified).toBe(false);
      expect(company.subscription.type).toBe('free');
    });

    test('should lowercase email', () => {
      const company = new Company({
        name: 'Test Company',
        email: 'TEST@COMPANY.COM',
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(company.email).toBe('test@company.com');
    });

    test('should trim whitespace from fields', () => {
      const company = new Company({
        name: '  Test Company  ',
        email: '  test@company.com  ',
        createdBy: new mongoose.Types.ObjectId()
      });

      expect(company.name).toBe('Test Company');
      expect(company.email).toBe('test@company.com');
    });
  });
});
