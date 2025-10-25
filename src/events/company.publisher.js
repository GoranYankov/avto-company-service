const { publish } = require('../utils/rabbitmq');
const logger = require('../utils/logger');

/**
 * Publish company.deleted event
 * @param {Object} company - Company object
 */
function publishCompanyDeleted(company) {
  try {
    const event = {
      event: 'company.deleted',
      data: {
        companyId: company._id.toString(),
        name: company.name,
        email: company.email,
        timestamp: new Date().toISOString()
      },
      service: 'company-service'
    };

    publish('company.deleted', event);
    
    logger.info('Published company.deleted event', {
      companyId: company._id,
      companyName: company.name
    });
  } catch (error) {
    logger.error('Error publishing company.deleted event', {
      error: error.message,
      companyId: company._id
    });
  }
}

/**
 * Publish company.created event (for future use)
 * @param {Object} company - Company object
 */
function publishCompanyCreated(company) {
  try {
    const event = {
      event: 'company.created',
      data: {
        companyId: company._id.toString(),
        name: company.name,
        email: company.email,
        registrationNumber: company.registrationNumber,
        createdBy: company.createdBy.toString(),
        timestamp: new Date().toISOString()
      },
      service: 'company-service'
    };

    publish('company.created', event);
    
    logger.info('Published company.created event', {
      companyId: company._id,
      companyName: company.name
    });
  } catch (error) {
    logger.error('Error publishing company.created event', {
      error: error.message,
      companyId: company._id
    });
  }
}

/**
 * Publish company.updated event (for future use)
 * @param {Object} company - Company object
 * @param {Array} updatedFields - Fields that were updated
 */
function publishCompanyUpdated(company, updatedFields = []) {
  try {
    const event = {
      event: 'company.updated',
      data: {
        companyId: company._id.toString(),
        name: company.name,
        email: company.email,
        updatedFields,
        timestamp: new Date().toISOString()
      },
      service: 'company-service'
    };

    publish('company.updated', event);
    
    logger.info('Published company.updated event', {
      companyId: company._id,
      updatedFields
    });
  } catch (error) {
    logger.error('Error publishing company.updated event', {
      error: error.message,
      companyId: company._id
    });
  }
}

module.exports = {
  publishCompanyDeleted,
  publishCompanyCreated,
  publishCompanyUpdated
};
