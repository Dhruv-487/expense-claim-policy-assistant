import mongoose from 'mongoose';
import Claim from '../models/claimModel.js';
import * as auditLogService from '../services/auditLogService.js';
import { executeClaimReview } from './claimReviewController.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * POST /api/claims/:id/clarification-response
 *
 * Employee submits a response to a pending clarification request.
 *
 * Workflow:
 * 1. Authenticate employee & verify claim ownership.
 * 2. Validate non-empty response (min 3 characters).
 * 3. Verify that a clarification request is actively pending (requested && !resolved).
 * 4. Persist employee response on the claim, marking clarification resolved = true.
 * 5. Record CLARIFICATION_RESPONDED audit event.
 * 6. Automatically re-execute the review pipeline (deterministic validation + grounded RAG + Gemini AI review).
 * 7. Return updated claim with fresh validation, AI review, and policy evidence.
 */
export const submitClarificationResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    // ── 1. Validate ID format ────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, `Invalid claim ID format: ${id}`);
    }

    // ── 2. Authenticated user verification ────────────────────────
    if (!req.user) {
      throw new ApiError(401, 'Authentication token required');
    }

    if (req.user.role !== 'EMPLOYEE') {
      throw new ApiError(403, 'Access denied: Only employees can submit clarification responses');
    }

    // ── 3. Validate response body ────────────────────────────────
    if (!response || typeof response !== 'string' || !response.trim()) {
      throw new ApiError(400, 'Clarification response is required');
    }

    const trimmedResponse = response.trim();
    if (trimmedResponse.length < 3) {
      throw new ApiError(400, 'Clarification response must be at least 3 characters long');
    }

    // ── 4. Fetch claim & verify existence ────────────────────────
    const claim = await Claim.findById(id);
    if (!claim) {
      throw new ApiError(404, `Expense claim with ID ${id} not found`);
    }

    // ── 5. Enforce employee ownership ────────────────────────────
    if (claim.userId && claim.userId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied: You can only respond to clarification requests on your own claims');
    }

    // ── 6. Verify pending clarification request ──────────────────
    if (!claim.clarification?.requested || claim.clarification?.resolved) {
      throw new ApiError(400, 'No clarification request is currently pending for this claim');
    }

    // ── 7. Persist clarification response on claim ───────────────
    const respondedAt = new Date();
    const updatedClaimAfterResponse = await Claim.findByIdAndUpdate(
      id,
      {
        'clarification.response': trimmedResponse,
        'clarification.respondedAt': respondedAt,
        'clarification.resolved': true,
        status: 'UNDER_REVIEW',
      },
      { new: true, runValidators: false }
    );

    // ── 8. Record audit log ──────────────────────────────────────
    await auditLogService.createAuditLog({
      claimId: claim._id,
      action: 'CLARIFICATION_RESPONDED',
      actorType: 'EMPLOYEE',
      description: `Employee clarification response submitted: "${trimmedResponse}"`,
      previousStatus: claim.status,
      newStatus: 'UNDER_REVIEW',
      decision: null,
      notes: trimmedResponse,
      override: false,
      timestamp: respondedAt,
      metadata: {
        employeeId: req.user._id,
        employeeName: req.user.name,
        response: trimmedResponse,
      },
    });

    // ── 9. Re-run policy review pipeline automatically ──────────
    // Executes deterministic validation + RAG retrieval + Gemini AI review with clarification context
    const fullyReviewedClaim = await executeClaimReview(id);

    return ApiResponse.send(
      res,
      200,
      fullyReviewedClaim,
      'Clarification response recorded and automated policy re-review completed'
    );
  } catch (error) {
    next(error);
  }
};
