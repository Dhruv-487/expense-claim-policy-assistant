import mongoose from 'mongoose';
import Claim, { CLAIM_CATEGORIES, CLAIM_CURRENCIES, CLAIM_STATUSES } from '../models/claimModel.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Validate input fields for creating or updating a claim
 */
export const validateClaimPayload = (payload, isUpdate = false) => {
  const errors = [];

  // Required field checks for creation
  if (!isUpdate) {
    if (!payload.claimant || typeof payload.claimant !== 'string' || !payload.claimant.trim()) {
      errors.push('Claimant name is required and must be text');
    }
    if (payload.date === undefined || payload.date === null) {
      errors.push('Date is required');
    }
    if (!payload.category) {
      errors.push('Category is required');
    }
    if (payload.amount === undefined || payload.amount === null) {
      errors.push('Amount is required');
    }
    if (!payload.description || typeof payload.description !== 'string' || !payload.description.trim()) {
      errors.push('Description is required and must be text');
    }
    if (payload.receiptAvailable === undefined || payload.receiptAvailable === null) {
      errors.push('receiptAvailable is required');
    }
  }

  // Type & constraint validations
  if (payload.claimant !== undefined && (typeof payload.claimant !== 'string' || !payload.claimant.trim())) {
    errors.push('Claimant name must be non-empty text');
  }

  if (payload.amount !== undefined) {
    const numAmount = Number(payload.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be a number greater than 0');
    }
  }

  if (payload.date !== undefined) {
    const parsedDate = new Date(payload.date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Date must be a valid date');
    }
  }

  if (payload.category !== undefined && !CLAIM_CATEGORIES.includes(payload.category)) {
    errors.push(`Category must be one of: ${CLAIM_CATEGORIES.join(', ')}`);
  }

  if (payload.currency !== undefined) {
    const upperCurrency = String(payload.currency).toUpperCase();
    if (!CLAIM_CURRENCIES.includes(upperCurrency)) {
      errors.push(`Currency must be one of: ${CLAIM_CURRENCIES.join(', ')}`);
    }
  }

  if (payload.receiptAvailable !== undefined && typeof payload.receiptAvailable !== 'boolean') {
    errors.push('receiptAvailable must be a boolean (true or false)');
  }

  if (payload.status !== undefined) {
    const upperStatus = String(payload.status).toUpperCase();
    if (!CLAIM_STATUSES.includes(upperStatus)) {
      errors.push(`Status must be one of: ${CLAIM_STATUSES.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation Error', errors);
  }
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid claim ID format: ${id}`);
  }
};

/**
 * Create a new expense claim
 */
export const createClaim = async (claimData, user = null) => {
  validateClaimPayload(claimData, false);

  const newClaim = new Claim({
    ...claimData,
    userId: user?._id || claimData.userId || null,
    currency: claimData.currency ? claimData.currency.toUpperCase() : 'INR',
    status: claimData.status ? claimData.status.toUpperCase() : 'PENDING',
  });

  return await newClaim.save();
};

/**
 * Retrieve expense claims sorted by newest first
 * If user is EMPLOYEE, returns only their own claims.
 * If user is REVIEWER or unauthenticated, returns all claims.
 */
export const getAllClaims = async (user = null) => {
  if (user && user.role === 'EMPLOYEE') {
    return await Claim.find({ userId: user._id }).sort({ createdAt: -1 });
  }
  return await Claim.find().sort({ createdAt: -1 });
};

/**
 * Retrieve a single claim by its ID
 * Employees can only access their own claims or legacy claims without a userId.
 * Reviewers can access any claim.
 */
export const getClaimById = async (id, user = null) => {
  validateObjectId(id);

  const claim = await Claim.findById(id);
  if (!claim) {
    throw new ApiError(404, `Expense claim with ID ${id} not found`);
  }

  // Enforce employee ownership
  if (user && user.role === 'EMPLOYEE') {
    if (claim.userId && claim.userId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied: You can only access your own claims');
    }
  }

  return claim;
};

/**
 * Update an existing claim by ID
 */
export const updateClaim = async (id, updateData, user = null) => {
  validateObjectId(id);
  validateClaimPayload(updateData, true);

  const claim = await Claim.findById(id);
  if (!claim) {
    throw new ApiError(404, `Expense claim with ID ${id} not found`);
  }

  // Enforce employee ownership
  if (user && user.role === 'EMPLOYEE') {
    if (claim.userId && claim.userId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied: You can only update your own claims');
    }
  }

  const formattedData = { ...updateData };
  if (formattedData.currency) {
    formattedData.currency = formattedData.currency.toUpperCase();
  }
  if (formattedData.status) {
    formattedData.status = formattedData.status.toUpperCase();
  }

  const updatedClaim = await Claim.findByIdAndUpdate(id, formattedData, {
    new: true,
    runValidators: true,
  });

  return updatedClaim;
};

/**
 * Delete a claim by ID
 */
export const deleteClaim = async (id, user = null) => {
  validateObjectId(id);

  const claim = await Claim.findById(id);
  if (!claim) {
    throw new ApiError(404, `Expense claim with ID ${id} not found`);
  }

  // Enforce employee ownership
  if (user && user.role === 'EMPLOYEE') {
    if (claim.userId && claim.userId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied: You can only delete your own claims');
    }
  }

  const deletedClaim = await Claim.findByIdAndDelete(id);
  return deletedClaim;
};
