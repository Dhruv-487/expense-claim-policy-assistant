import mongoose from 'mongoose';
import Claim from '../models/claimModel.js';
import * as auditLogService from '../services/auditLogService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

const VALID_DECISIONS = ['APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED', 'OVERRIDDEN'];
const VALID_OVERRIDE_STATUSES = ['APPROVED', 'REJECTED'];

/**
 * POST /api/claims/:id/decision
 *
 * Submit a human reviewer decision on an expense claim.
 *
 * Supported decisions:
 *   APPROVED                → claim.status = APPROVED
 *   REJECTED                → claim.status = REJECTED
 *   CLARIFICATION_REQUESTED → claim.status = UNDER_REVIEW
 *   OVERRIDDEN              → claim.status = overrideStatus (APPROVED | REJECTED)
 *
 * The AI review (aiReview) is NEVER modified by this endpoint.
 * The human reviewer is always the final decision maker.
 */
export const submitDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, notes, overrideStatus } = req.body;

    // ── Validate claim ID format ────────────────────────
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, `Invalid claim ID format: ${id}`);
    }

    // ── Validate decision enum ──────────────────────────
    if (!decision || !VALID_DECISIONS.includes(decision)) {
      throw new ApiError(
        400,
        `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}`
      );
    }

    // ── Validate notes length ───────────────────────────
    if (notes !== undefined && notes !== null && typeof notes === 'string' && notes.length > 2000) {
      throw new ApiError(400, 'Reviewer notes cannot exceed 2000 characters');
    }

    // ── REJECTED requires notes ─────────────────────────
    if (decision === 'REJECTED' && (!notes || !notes.trim())) {
      throw new ApiError(400, 'Reviewer notes are required when rejecting a claim');
    }

    // ── CLARIFICATION_REQUESTED requires notes ──────────
    if (decision === 'CLARIFICATION_REQUESTED' && (!notes || !notes.trim())) {
      throw new ApiError(400, 'Clarification message is required when requesting clarification');
    }

    // ── OVERRIDDEN validation ───────────────────────────
    if (decision === 'OVERRIDDEN') {
      if (!overrideStatus || !VALID_OVERRIDE_STATUSES.includes(overrideStatus)) {
        throw new ApiError(
          400,
          `Override requires overrideStatus to be one of: ${VALID_OVERRIDE_STATUSES.join(', ')}`
        );
      }
      if (!notes || !notes.trim()) {
        throw new ApiError(400, 'Reviewer notes are required when overriding the AI recommendation');
      }
    }

    // ── Fetch claim ─────────────────────────────────────
    const claim = await Claim.findById(id);
    if (!claim) {
      throw new ApiError(404, `Expense claim with ID ${id} not found`);
    }

    // ── Determine new claim status ──────────────────────
    let newStatus;
    switch (decision) {
      case 'APPROVED':
        newStatus = 'APPROVED';
        break;
      case 'REJECTED':
        newStatus = 'REJECTED';
        break;
      case 'CLARIFICATION_REQUESTED':
        newStatus = 'UNDER_REVIEW';
        break;
      case 'OVERRIDDEN':
        newStatus = overrideStatus; // APPROVED or REJECTED
        break;
    }

    // ── Build reviewerDecision record ───────────────────
    const reviewerDecisionRecord = {
      decision,
      notes: notes?.trim() || '',
      previousStatus: claim.status,
      previousAIReviewStatus: claim.aiReview?.reviewStatus || null,
      override: decision === 'OVERRIDDEN',
      overrideStatus: decision === 'OVERRIDDEN' ? overrideStatus : undefined,
      decidedAt: new Date(),
    };

    // ── Build update payload ───────────────────────────
    const updatePayload = {
      status: newStatus,
      reviewerDecision: reviewerDecisionRecord,
    };

    if (decision === 'CLARIFICATION_REQUESTED') {
      updatePayload.clarification = {
        requested: true,
        message: notes.trim(),
        requestedAt: new Date(),
        requestedBy: {
          reviewerId: req.user?._id || null,
          reviewerName: req.user?.name || 'Reviewer',
        },
        response: null,
        respondedAt: null,
        resolved: false,
      };
    }

    // ── Persist: update status + reviewerDecision (+ clarification if requested), preserve aiReview ──
    const updatedClaim = await Claim.findByIdAndUpdate(
       id,
       updatePayload,
       { new: true, runValidators: false }
     );

    const isOverride = decision === 'OVERRIDDEN';
    const description = isOverride
      ? `Reviewer decision submitted: OVERRIDDEN AI recommendation (${claim.aiReview?.reviewStatus || 'N/A'}) to ${overrideStatus}`
      : `Reviewer decision submitted: ${decision}`;

    // Record audit event
    await auditLogService.createAuditLog({
      claimId: claim._id,
      action: 'REVIEWER_DECISION',
      actorType: 'REVIEWER',
      description,
      previousStatus: claim.status,
      newStatus: updatedClaim.status,
      decision,
      notes: notes?.trim() || null,
      override: isOverride,
      timestamp: updatedClaim.reviewerDecision?.decidedAt || new Date(),
      metadata: {
        overrideStatus: isOverride ? overrideStatus : undefined,
        previousAIReviewStatus: claim.aiReview?.reviewStatus || null,
        reviewerId: req.user?._id || null,
        reviewerName: req.user?.name || null,
      },
    });

    const decisionLabel = decision === 'OVERRIDDEN'
      ? `OVERRIDDEN → ${overrideStatus}`
      : decision;

    return ApiResponse.send(
      res,
      200,
      updatedClaim,
      `Reviewer decision recorded: ${decisionLabel}`
    );
  } catch (error) {
    next(error);
  }
};
