const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole, requireOwnerOrAdmin } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validationMiddleware');
const {
  createCompanyValidation,
  updateCompanyValidation,
  getCompanyByIdValidation,
  deleteCompanyValidation,
  getAllCompaniesValidation
} = require('../validators/companyValidators');

/**
 * Company Routes
 * All routes require authentication
 */

// Public/Admin routes (must be before :id routes to avoid conflicts)
router.get(
  '/stats',
  authenticate,
  requireRole(['admin']),
  companyController.getStats
);

// User-specific routes
router.get(
  '/my/companies',
  authenticate,
  companyController.getMyCompanies
);

// CRUD operations
router.post(
  '/',
  authenticate,
  createCompanyValidation,
  validate,
  companyController.createCompany
);

router.get(
  '/',
  authenticate,
  getAllCompaniesValidation,
  validate,
  companyController.getAllCompanies
);

router.get(
  '/:id',
  authenticate,
  getCompanyByIdValidation,
  validate,
  companyController.getCompanyById
);

router.put(
  '/:id',
  authenticate,
  updateCompanyValidation,
  validate,
  companyController.updateCompany
);

router.patch(
  '/:id',
  authenticate,
  updateCompanyValidation,
  validate,
  companyController.updateCompany
);

router.delete(
  '/:id',
  authenticate,
  deleteCompanyValidation,
  validate,
  companyController.deleteCompany
);

module.exports = router;