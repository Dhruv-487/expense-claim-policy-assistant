import apiClient from './apiClient';

/**
 * Fetch all expense claims
 */
export const getClaims = async () => {
  return await apiClient.get('/claims');
};

/**
 * Fetch current user's submitted expense claims
 */
export const getMyClaims = async () => {
  return await apiClient.get('/claims/my');
};

/**
 * Fetch a single expense claim by ID
 */
export const getClaimById = async (id) => {
  return await apiClient.get(`/claims/${id}`);
};

/**
 * Create a new expense claim
 */
export const createClaim = async (claimData) => {
  return await apiClient.post('/claims', claimData);
};

/**
 * Update an existing expense claim
 */
export const updateClaim = async (id, updateData) => {
  return await apiClient.put(`/claims/${id}`, updateData);
};

/**
 * Delete an expense claim
 */
export const deleteClaim = async (id) => {
  return await apiClient.delete(`/claims/${id}`);
};

/**
 * Validate an expense claim using deterministic rules
 */
export const validateClaim = async (id) => {
  return await apiClient.post(`/claims/${id}/validate`);
};

/**
 * Review an expense claim with grounded Gemini AI policy review
 */
export const reviewClaim = async (id) => {
  return await apiClient.post(`/claims/${id}/review`);
};

/**
 * Submit a human reviewer decision on an expense claim
 * @param {string} id - Claim ID
 * @param {object} payload - { decision, notes?, overrideStatus? }
 */
export const submitReviewerDecision = async (id, payload) => {
  return await apiClient.post(`/claims/${id}/decision`, payload);
};

/**
 * Submit an employee response to a clarification request
 * @param {string} id - Claim ID
 * @param {object} payload - { response: string }
 */
export const submitClarificationResponse = async (id, payload) => {
  return await apiClient.post(`/claims/${id}/clarification-response`, payload);
};

/**
 * Fetch audit trail history for an expense claim
 * @param {string} id - Claim ID
 */
export const getClaimAuditHistory = async (id) => {
  return await apiClient.get(`/claims/${id}/audit-history`);
};


