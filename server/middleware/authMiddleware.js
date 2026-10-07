import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_expense_assistant_jwt_token_2026';

/**
 * Authenticate JWT token and attach user to req.user
 * Throws 401 if token is missing, invalid, or expired
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authentication token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new ApiError(401, 'User account not found');
    }

    req.user = user;
    req.user.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication: attaches user if valid token exists, but doesn't reject if missing.
 * Allows backwards compatibility for existing claims and endpoints.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await User.findById(decoded.userId).select('-password');
          if (user) {
            req.user = user;
            req.user.userId = user._id;
          }
        } catch {
          // Ignore invalid token in optional auth
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware for reviewer-only endpoints
 * Throws 403 if authenticated user does not have REVIEWER role
 */
export const requireReviewer = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'REVIEWER') {
    return next(new ApiError(403, 'Access denied: Reviewer privileges required'));
  }

  next();
};
