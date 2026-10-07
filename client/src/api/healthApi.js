import apiClient from './apiClient';

export const getSystemHealth = async () => {
  return await apiClient.get('/health');
};
