import * as claimService from '../services/claimService.js';
import * as auditLogService from '../services/auditLogService.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * POST /api/claims
 * Create a new expense claim
 */
export const createClaim = async (req, res, next) => {
  try {
    const newClaim = await claimService.createClaim(req.body, req.user);

    // Record audit event
    await auditLogService.createAuditLog({
      claimId: newClaim._id,
      action: 'CLAIM_CREATED',
      actorType: 'SYSTEM',
      description: `Expense claim created for ${newClaim.claimant} (${newClaim.category}, ${newClaim.amount} ${newClaim.currency})`,
      previousStatus: null,
      newStatus: newClaim.status,
      decision: null,
      notes: null,
      override: false,
      timestamp: newClaim.createdAt || new Date(),
      metadata: {
        claimant: newClaim.claimant,
        category: newClaim.category,
        amount: newClaim.amount,
        currency: newClaim.currency,
        userId: req.user?._id || null,
      },
    });

    return ApiResponse.send(res, 201, newClaim, 'Expense claim created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/claims
 * Retrieve expense claims sorted by newest first (filtered by user if employee)
 */
export const getAllClaims = async (req, res, next) => {
  try {
    const claims = await claimService.getAllClaims(req.user);
    return ApiResponse.send(res, 200, claims, 'Expense claims retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/claims/:id
 * Retrieve a single claim by its MongoDB ID (ownership enforced for employees)
 */
export const getClaimById = async (req, res, next) => {
  try {
    const claim = await claimService.getClaimById(req.params.id, req.user);
    return ApiResponse.send(res, 200, claim, 'Expense claim retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/claims/:id
 * Update an existing claim
 */
export const updateClaim = async (req, res, next) => {
  try {
    const updatedClaim = await claimService.updateClaim(req.params.id, req.body, req.user);
    return ApiResponse.send(res, 200, updatedClaim, 'Expense claim updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/claims/:id
 * Delete an expense claim
 */
export const deleteClaim = async (req, res, next) => {
  try {
    const deletedClaim = await claimService.deleteClaim(req.params.id, req.user);
    return ApiResponse.send(res, 200, deletedClaim, 'Expense claim deleted successfully');
  } catch (error) {
    next(error);
  }
};
