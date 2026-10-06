import { runValidation } from '../services/claimValidationService.js';
import { getClaimById } from '../services/claimService.js';
import * as auditLogService from '../services/auditLogService.js';
import Claim from '../models/claimModel.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * POST /api/claims/:id/validate
 *
 * Runs the deterministic validation engine against a stored claim.
 * Persists the structured results back to the claim document.
 * Updates claim status to UNDER_REVIEW when ERROR-level issues are found.
 */
export const validateClaim = async (req, res, next) => {
  try {
    // Retrieve the claim — getClaimById handles ObjectId format validation + 404
    const claim = await getClaimById(req.params.id);

    // Run all deterministic rules
    const result = await runValidation(claim);

    // Determine new status:
    // If any ERROR-level issue is found, escalate to UNDER_REVIEW.
    // Do NOT automatically approve or reject.
    const hasErrors = result.issues.length > 0;
    const newStatus = hasErrors ? 'UNDER_REVIEW' : claim.status;

    // Persist validation results + potential status change atomically
    const updatedClaim = await Claim.findByIdAndUpdate(
      claim._id,
      {
        validationResults: {
          valid: result.valid,
          issues: result.issues,
          warnings: result.warnings,
          checks: result.checks,
          validatedAt: new Date(),
        },
        status: newStatus,
      },
      { new: true, runValidators: false }
    );

    // Record audit event
    await auditLogService.createAuditLog({
      claimId: claim._id,
      action: 'CLAIM_VALIDATED',
      actorType: 'SYSTEM',
      description: result.valid
        ? 'Deterministic policy validation completed: Passed all checks'
        : `Deterministic policy validation completed: ${result.issues.length} issue(s) detected`,
      previousStatus: claim.status,
      newStatus: updatedClaim.status,
      decision: null,
      notes: null,
      override: false,
      timestamp: updatedClaim.validationResults.validatedAt || new Date(),
      metadata: {
        valid: result.valid,
        issuesCount: result.issues?.length || 0,
        warningsCount: result.warnings?.length || 0,
      },
    });

    return ApiResponse.send(res, 200, {
      valid: result.valid,
      issues: result.issues,
      warnings: result.warnings,
      checks: result.checks,
      validatedAt: updatedClaim.validationResults.validatedAt,
      claim: updatedClaim,
      validation: {
        valid: result.valid,
        issues: result.issues,
        warnings: result.warnings,
        checks: result.checks,
        validatedAt: updatedClaim.validationResults.validatedAt,
      },
    }, result.valid
      ? 'Claim passed all policy validation checks.'
      : `Claim validation completed — ${result.issues.length} issue(s) found.`
    );
  } catch (error) {
    next(error);
  }
};
