import jwt from 'jsonwebtoken';
import User, { USER_ROLES } from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_expense_assistant_jwt_token_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * POST /api/auth/register
 * Register a new employee or reviewer user
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, 'Name is required');
    }
    if (name.trim().length < 2) {
      throw new ApiError(400, 'Name must be at least 2 characters long');
    }

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new ApiError(400, 'Email is required');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new ApiError(400, 'Please provide a valid email address');
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      throw new ApiError(400, 'Password is required');
    }
    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    // Validate role if specified
    const formattedRole = role ? String(role).toUpperCase().trim() : 'EMPLOYEE';
    if (!USER_ROLES.includes(formattedRole)) {
      throw new ApiError(
        400,
        `Invalid role. Must be one of: ${USER_ROLES.join(', ')}`
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email address already exists');
    }

    // Create user (password will be hashed via Mongoose pre-save hook)
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: formattedRole,
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    return ApiResponse.send(
      res,
      201,
      {
        user: user.toSafeObject(),
        token,
      },
      'User registered successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate existing user with email and password
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user);

    return ApiResponse.send(
      res,
      200,
      {
        user: user.toSafeObject(),
        token,
      },
      'User logged in successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retrieve profile information for the authenticated user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const safeUser = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;

    return ApiResponse.send(
      res,
      200,
      safeUser,
      'User profile retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
