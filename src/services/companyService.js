const Company = require('../models/Company');
const { 
  NotFoundError, 
  ConflictError
} = require('../utils/customErrors');
const logger = require('../utils/logger');

/**
 * Company Service
 * Business logic layer for company operations
 */

class CompanyService {
  /**
   * Create a new company
   * @param {Object} companyData - Company data
   * @param {string} userId - ID of the user creating the company
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData, userId) {
    try {
      // Check if company with email already exists
      const existingCompany = await Company.findOne({ 
        email: companyData.email,
        isActive: true 
      });

      if (existingCompany) {
        throw new ConflictError('Company with this email already exists');
      }

      // Create company
      const company = await Company.create({
        ...companyData,
        createdBy: userId
      });

      logger.info('Company created', { 
        companyId: company._id, 
        createdBy: userId 
      });

      return company;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictError('Company with this email already exists');
      }
      throw error;
    }
  }

  /**
   * Create company from auth event
   * Called when user registers via auth service
   * @param {Object} payload - Event payload
   * @returns {Promise<Object>} Created company
   */
  async createFromAuthEvent(payload) {
    try {
      const { userId, email, company: companyData, contact } = payload;

      // Check if company already exists for this user
      const existingCompany = await Company.findOne({ createdBy: userId });
      if (existingCompany) {
        logger.warn('Company already exists for user', { userId });
        return existingCompany;
      }
      console.log('Testing nodemon restart - ' + new Date().toISOString());
      const company = await Company.create({
        name: companyData.name,
        registrationNumber: companyData.registrationNumber,
        eik: companyData?.eik || 'пrшо',
        vatNumber: companyData?.vatNumber || 'пrшо',
        email,
        phone: contact?.phone,
        address: {
          street: contact?.address,
          city: contact?.city,
          postalCode: contact?.postalCode,
          country: contact?.country
        },
        createdBy: userId,
        isVerified: false
      });

      logger.info('Company created from auth event', { 
        companyId: company._id, 
        userId 
      });

      return company;
    } catch (error) {
      logger.error('Failed to create company from auth event', { 
        error: error.message,
        payload 
      });
      throw error;
    }
  }

  /**
   * Update company email verification status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated company
   */
  async updateEmailVerified(userId) {
    const company = await Company.findOne({ createdBy: userId });
    
    if (!company) {
      logger.warn('Company not found for email verification', { userId });
      return null;
    }

    company.isVerified = true;
    await company.save();

    logger.info('Company email verified', { 
      companyId: company._id, 
      userId 
    });

    return company;
  }

  /**
   * Get all companies with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options (page, limit, sort)
   * @returns {Promise<Object>} Companies and pagination info
   */
  async getAllCompanies(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = options;

    // Build query
    const query = { ...filter };

    // Text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    logger.debug('Companies retrieved', { 
      count: companies.length, 
      total, 
      page, 
      limit 
    });

    return {
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get company by ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company
   */
  async getCompanyById(companyId) {
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new NotFoundError('Company');
    }

    if (!company.isActive) {
      throw new NotFoundError('Company');
    }

    return company;
  }

  /**
   * Update company
   * @param {string} companyId - Company ID
   * @param {Object} updateData - Update data
   * @param {string} userId - ID of user performing update
   * @returns {Promise<Object>} Updated company
   */
  async updateCompany(companyId, updateData, userId) {
    const company = await this.getCompanyById(companyId);

    // Check if email is being changed and if it's already taken
    if (updateData.email && updateData.email !== company.email) {
      const existingCompany = await Company.findOne({ 
        email: updateData.email,
        _id: { $ne: companyId },
        isActive: true
      });

      if (existingCompany) {
        throw new ConflictError('Email already in use by another company');
      }
    }

    // Update company
    Object.assign(company, updateData);
    await company.save();

    logger.info('Company updated', { 
      companyId, 
      updatedBy: userId 
    });

    return company;
  }

  /**
   * Delete company (soft delete)
   * @param {string} companyId - Company ID
   * @param {string} userId - ID of user performing deletion
   * @returns {Promise<Object>} Deleted company
   */
  async deleteCompany(companyId, userId) {
    const company = await this.getCompanyById(companyId);

    // Soft delete
    company.isActive = false;
    await company.save();

    logger.info('Company soft deleted', { 
      companyId, 
      deletedBy: userId 
    });

    return company;
  }

  /**
   * Get companies by creator
   * @param {string} userId - Creator user ID
   * @returns {Promise<Array>} Companies
   */
  async getCompaniesByCreator(userId) {
    const companies = await Company.findByCreator(userId);
    
    logger.debug('Companies retrieved by creator', { 
      userId, 
      count: companies.length 
    });

    return companies;
  }

  /**
   * Check if user owns company
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user owns company
   */
  async isOwner(companyId, userId) {
    const company = await Company.findOne({
      _id: companyId,
      createdBy: userId,
      isActive: true
    });

    return !!company;
  }

  /**
   * Get company statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const [
      total,
      active,
      verified,
      bySubscription
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      Company.countDocuments({ isVerified: true }),
      Company.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$subscription.type', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total,
      active,
      verified,
      subscriptions: bySubscription.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  }
}

module.exports = new CompanyService();
