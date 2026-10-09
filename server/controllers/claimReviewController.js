import { getClaimById } from '../services/claimService.js';
import { runValidation } from '../services/claimValidationService.js';
import { retrievePolicy } from '../services/policyRetrievalService.js';
import { reviewClaimWithAI } from '../services/aiReviewService.js';
import * as auditLogService from '../services/auditLogService.js';
import Claim from '../models/claimModel.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Core policy review engine:
 * 1. Fetches claim and validates ID format.
 * 2. Runs deterministic policy validation rules.
 * 3. Builds a contextual query including clarification and retrieves grounded policy evidence via RAG.
 * 4. Generates a structured AI policy review using Gemini.
 * 5. Atomically persists aiReview and updates claim status if errors exist.
 * 6. Records AI_REVIEWED audit event.
 * 7. Returns updated Claim document.
 */
export const executeClaimReview = async (id) => {
  // 1. Fetch claim — getClaimById handles ObjectId validation and 404
  const claim = await getClaimById(id);

  // 2. Run authoritative deterministic validation
  const validationResult = await runValidation(claim);

  // 3. Build semantic retrieval query incorporating claim, clarification, and validation issues
  const issueContext = (validationResult.issues || []).map((i) => i.message).join(' ');
  const warningContext = (validationResult.warnings || []).map((w) => w.message).join(' ');
  const clarificationContext = [
    claim.clarification?.message ? `Clarification requested: ${claim.clarification.message}` : null,
    claim.clarification?.response ? `Clarification response: ${claim.clarification.response}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const retrievalQuery = [
    claim.category,
    claim.currency,
    claim.amount,
    claim.description,
    clarificationContext,
    issueContext,
    warningContext,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  // 4. Retrieve top-3 relevant policy chunks from RAG vector store
  const retrievedEvidence = await retrievePolicy(retrievalQuery, 3);

  // 5. Invoke Gemini AI Review Service
  const aiResult = await reviewClaimWithAI({
    claim,
    validationResult,
    policyEvidence: retrievedEvidence,
  });

  // 6. Map cited section IDs back to ORIGINAL retrieved policy text (never hallucinated text)
  const citedChunks = retrievedEvidence.filter((chunk) =>
    aiResult.policySectionIds.includes(chunk.sectionId)
  );

  const groundedPolicyEvidence = (
    citedChunks.length > 0 ? citedChunks : retrievedEvidence
  ).map((chunk) => ({
    sectionId: chunk.sectionId,
    sectionTitle: chunk.sectionTitle,
    text: chunk.text,
  }));

  // 7. Update status: If deterministic errors exist, escalate to UNDER_REVIEW
  // Do NOT automatically approve or reject
  const hasDeterministicErrors =
    validationResult.valid === false ||
    (Array.isArray(validationResult.issues) &&
      validationResult.issues.some((i) => i.severity === 'ERROR'));

  const newStatus = hasDeterministicErrors ? 'UNDER_REVIEW' : claim.status;

  // 8. Build aiReview subdocument
  const configuredModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const aiReviewRecord = {
    provider: 'google',
    model: configuredModel,
    reviewedAt: new Date(),
    classification: aiResult.classification,
    reviewStatus: aiResult.reviewStatus,
    reason: aiResult.reason,
    missingInformation: aiResult.missingInformation,
    policyEvidence: groundedPolicyEvidence,
  };

  // 9. Persist review and validation results atomically (replaces previous review if re-run)
  const updatedClaim = await Claim.findByIdAndUpdate(
    claim._id,
    {
      aiReview: aiReviewRecord,
      status: newStatus,
      validationResults: {
        valid: validationResult.valid,
        issues: validationResult.issues,
        warnings: validationResult.warnings,
        checks: validationResult.checks,
        validatedAt: new Date(),
      },
    },
    { new: true, runValidators: false }
  );

  // Record audit event
  await auditLogService.createAuditLog({
    claimId: claim._id,
    action: 'AI_REVIEWED',
    actorType: 'SYSTEM',
    description: `AI policy review completed: ${aiResult.reviewStatus}${
      aiResult.classification?.confidence !== undefined
        ? ` (${Math.round(aiResult.classification.confidence * 100)}% confidence)`
        : ''
    }`,
    previousStatus: claim.status,
    newStatus: updatedClaim.status,
    decision: null,
    notes: aiResult.reason || null,
    override: false,
    timestamp: updatedClaim.aiReview?.reviewedAt || new Date(),
    metadata: {
      reviewStatus: aiResult.reviewStatus,
      confidence: aiResult.classification?.confidence,
      classificationCategory: aiResult.classification?.category,
      model: configuredModel,
    },
  });

  return updatedClaim;
};

/**
 * POST /api/claims/:id/review
 *
 * Runs end-to-end policy review for an expense claim and sends HTTP response.
 */
export const reviewClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedClaim = await executeClaimReview(id);

    return ApiResponse.send(
      res,
      200,
      {
        claim: updatedClaim,
        aiReview: updatedClaim.aiReview,
      },
      `Claim AI policy review completed: ${updatedClaim.aiReview.reviewStatus}`
    );
  } catch (error) {
    next(error);
  }
};
