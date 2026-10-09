import * as auditLogService from '../services/auditLogService.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * GET /api/claims/:id/audit-history
 * Retrieve full audit trail for an expense claim, sorted newest first
 */
export const getClaimAuditHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await auditLogService.getAuditHistoryByClaimId(id);
    return ApiResponse.send(
      res,
      200,
      history,
      'Claim audit history retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
