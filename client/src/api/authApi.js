import apiClient from './apiClient';

/**
 * Register a new employee or reviewer
 * @param {Object} userData - { name, email, password, role }
 */
export const registerApi = async (userData) => {
  return await apiClient.post('/auth/register', userData);
};

/**
 * Log in an existing user
 * @param {Object} credentials - { email, password }
 */
export const loginApi = async (credentials) => {
  return await apiClient.post('/auth/login', credentials);
};

/**
 * Fetch current authenticated user's profile
 */
export const getMeApi = async () => {
  return await apiClient.get('/auth/me');
};
