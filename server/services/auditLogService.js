import mongoose from 'mongoose';
import AuditLog from '../models/auditLogModel.js';
import Claim from '../models/claimModel.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid claim ID format: ${id}`);
  }
};

/**
 * Record a new audit log entry
 *
 * @param {Object} data
 * @param {string|ObjectId} data.claimId - ObjectId reference to Claim
 * @param {string} data.action - Action type (CLAIM_CREATED, CLAIM_VALIDATED, AI_REVIEWED, REVIEWER_DECISION)
 * @param {string} data.actorType - Actor type (SYSTEM or REVIEWER)
 * @param {string} data.description - Human-readable description
 * @param {string} [data.previousStatus=null] - Previous claim status
 * @param {string} [data.newStatus=null] - New claim status
 * @param {string} [data.decision=null] - Reviewer decision
 * @param {string} [data.notes=null] - Reviewer notes
 * @param {boolean} [data.override=false] - Whether AI recommendation was overridden
 * @param {Date} [data.timestamp=new Date()] - Timestamp
 * @param {Object} [data.metadata={}] - Optional additional metadata
 * @returns {Promise<Document>} Saved AuditLog document
 */
export const createAuditLog = async ({
  claimId,
  action,
  actorType,
  description,
  previousStatus = null,
  newStatus = null,
  decision = null,
  notes = null,
  override = false,
  timestamp = new Date(),
  metadata = {},
}) => {
  validateObjectId(claimId);

  const logEntry = new AuditLog({
    claimId,
    action,
    actorType,
    description,
    previousStatus,
    newStatus,
    decision,
    notes,
    override: Boolean(override),
    timestamp,
    metadata,
  });

  return await logEntry.save();
};

/**
 * Retrieve audit history for a specific claim sorted newest first
 *
 * Validates:
 * 1. MongoDB ObjectId format (400 if invalid)
 * 2. Claim existence in the database (404 if not found)
 *
 * @param {string} claimId - Claim ID to retrieve audit history for
 * @returns {Promise<Array>} Array of AuditLog documents, newest first (empty array if none exist)
 */
export const getAuditHistoryByClaimId = async (claimId) => {
  validateObjectId(claimId);

  // Verify that the claim exists
  const claimExists = await Claim.exists({ _id: claimId });
  if (!claimExists) {
    throw new ApiError(404, `Expense claim with ID ${claimId} not found`);
  }

  // Retrieve audit events sorted newest first
  return await AuditLog.find({ claimId }).sort({ timestamp: -1, _id: -1 });
};
