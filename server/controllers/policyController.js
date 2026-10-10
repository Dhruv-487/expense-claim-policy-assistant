import { retrievePolicy } from '../services/policyRetrievalService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

/**
 * GET /api/policy/search?q=<query>&topK=<k>
 *
 * Retrieves policy sections semantically matching the query.
 */
export const searchPolicy = async (req, res, next) => {
  try {
    const { q, topK } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      throw new ApiError(400, 'Search query parameter "q" is required and cannot be empty.');
    }

    const results = await retrievePolicy(q, topK);

    return ApiResponse.send(
      res,
      200,
      results,
      `Retrieved ${results.length} relevant policy section(s).`
    );
  } catch (error) {
    next(error);
  }
};
