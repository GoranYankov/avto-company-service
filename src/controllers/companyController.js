const companyService = require('../services/companyService');
const asyncHandler = require('../utils/asyncHandler');
const { ForbiddenError } = require('../utils/customErrors');

/**
 * Company Controller
 * Handles HTTP requests for company operations
 */

/**
 * Create a new company
 * POST /api/company
 */
exports.createCompany = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const companyData = req.body;

  // Security: Ensure user cannot set protected fields
  delete companyData.isVerified;
  delete companyData.createdBy;
  delete companyData.isActive;

  const company = await companyService.createCompany(companyData, userId);

  res.status(201).json({
    success: true,
    data: company,
    message: 'Company created successfully'
  });
});

/**
 * Get all companies
 * GET /api/company
 * Query params: page, limit, sortBy, sortOrder, search, isActive, isVerified
 */
exports.getAllCompanies = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, isActive, isVerified } = req.query;
  const userRoles = req.user?.roles || [];
  const isAdmin = userRoles.includes('admin');

  // Build filter
  const filter = {};
  
  // Only admins can see inactive companies
  if (!isAdmin) {
    filter.isActive = true;
  } else if (isActive !== undefined) {
    filter.isActive = isActive;
  }
  
  if (isVerified !== undefined) filter.isVerified = isVerified;

  // Build options
  const options = {
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 10, 100), // Cap at 100
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
    search
  };

  const result = await companyService.getAllCompanies(filter, options);

  res.status(200).json({
    success: true,
    data: result.companies,
    pagination: result.pagination
  });
});

/**
 * Get company by ID
 * GET /api/company/:id
 */
exports.getCompanyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRoles = req.user?.roles || [];

  // Input validation is handled by validator middleware
  const company = await companyService.getCompanyById(id);

  // Authorization check: only owner or admin can view
  const isAdmin = userRoles.includes('admin');
  const isOwner = company.createdBy.toString() === userId;

  if (!isAdmin && !isOwner) {
    throw new ForbiddenError('You do not have permission to view this company');
  }

  res.status(200).json({
    success: true,
    data: company
  });
});

/**
 * Update company
 * PUT /api/company/:id
 */
exports.updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRoles = req.user?.roles || [];
  const updateData = req.body;

  // Validate that request body is not empty
  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No update data provided'
    });
  }

  // Authorization check: only owner or admin can update
  const isAdmin = userRoles.includes('admin');
  const isOwner = await companyService.isOwner(id, userId);

  if (!isAdmin && !isOwner) {
    throw new ForbiddenError('You do not have permission to update this company');
  }

  // Security: Non-admins cannot change certain protected fields
  if (!isAdmin) {
    delete updateData.isVerified;
    delete updateData.createdBy;
    delete updateData.isActive;
  }

  const company = await companyService.updateCompany(id, updateData, userId);

  res.status(200).json({
    success: true,
    data: company,
    message: 'Company updated successfully'
  });
});

/**
 * Delete company
 * DELETE /api/company/:id
 */
exports.deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRoles = req.user?.roles || [];

  // Authorization check: only owner or admin can delete
  const isAdmin = userRoles.includes('admin');
  const isOwner = await companyService.isOwner(id, userId);

  if (!isAdmin && !isOwner) {
    throw new ForbiddenError('You do not have permission to delete this company');
  }

  await companyService.deleteCompany(id, userId);

  res.status(200).json({
    success: true,
    message: 'Company deleted successfully'
  });
});

/**
 * Get my companies
 * GET /api/company/my/companies
 */
exports.getMyCompanies = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ForbiddenError('User ID not found in request');
  }

  const companies = await companyService.getCompaniesByCreator(userId);

  res.status(200).json({
    success: true,
    data: companies,
    count: companies.length
  });
});

/**
 * Get company statistics (admin only)
 * GET /api/company/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
  const stats = await companyService.getStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});
