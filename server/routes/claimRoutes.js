import { Router } from 'express';
import {
  createClaim,
  getAllClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
} from '../controllers/claimController.js';
import { validateClaim } from '../controllers/claimValidationController.js';
import { reviewClaim } from '../controllers/claimReviewController.js';
import { submitDecision } from '../controllers/reviewerDecisionController.js';
import { getClaimAuditHistory } from '../controllers/auditLogController.js';
import { submitClarificationResponse } from '../controllers/claimClarificationController.js';
import {
  authenticateUser,
  optionalAuth,
  requireReviewer,
} from '../middleware/authMiddleware.js';

const router = Router();

router.route('/')
  .post(optionalAuth, createClaim)
  .get(optionalAuth, getAllClaims);

router.route('/my')
  .get(authenticateUser, getAllClaims);

router.route('/:id/validate')
  .post(optionalAuth, validateClaim);

router.route('/:id/review')
  .post(optionalAuth, reviewClaim);

router.route('/:id/decision')
  .post(authenticateUser, requireReviewer, submitDecision);

router.route('/:id/clarification-response')
  .post(authenticateUser, submitClarificationResponse);

router.route('/:id/audit-history')
  .get(authenticateUser, requireReviewer, getClaimAuditHistory);

router.route('/:id')
  .get(optionalAuth, getClaimById)
  .put(optionalAuth, updateClaim)
  .delete(optionalAuth, deleteClaim);

export default router;

