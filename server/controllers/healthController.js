import { checkHealth } from '../services/healthService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getHealth = async (req, res, next) => {
  try {
    const healthData = await checkHealth();
    return ApiResponse.send(res, 200, healthData, 'Expense Claim Policy Review Assistant API is operational');
  } catch (error) {
    next(error);
  }
};
