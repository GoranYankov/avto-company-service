const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a company
 */
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s+()-]+$/).withMessage('Invalid phone number format'),
  
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Street address too long'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country name too long'),
  
  body('subscription.type')
    .optional()
    .isIn(['free', 'standard', 'premium']).withMessage('Invalid subscription type'),
  
  body('subscription.expiresAt')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate()
];

/**
 * Validation rules for updating a company
 */
const updateCompanyValidation = [
  param('id')
    .isMongoId().withMessage('Invalid company ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s+()-]+$/).withMessage('Invalid phone number format'),
  
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Street address too long'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country name too long'),
  
  body('subscription.type')
    .optional()
    .isIn(['free', 'standard', 'premium']).withMessage('Invalid subscription type'),
  
  body('subscription.expiresAt')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  body('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean')
];

/**
 * Validation rules for getting a company by ID
 */
const getCompanyByIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid company ID')
];

/**
 * Validation rules for deleting a company
 */
const deleteCompanyValidation = [
  param('id')
    .isMongoId().withMessage('Invalid company ID')
];

/**
 * Validation rules for query parameters
 */
const getCompaniesQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  
  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
  
  query('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean')
    .toBoolean(),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Search query too long')
];

module.exports = {
  createCompanyValidation,
  updateCompanyValidation,
  getCompanyByIdValidation,
  deleteCompanyValidation,
  getAllCompaniesValidation: getCompaniesQueryValidation,
  getCompaniesQueryValidation
};
