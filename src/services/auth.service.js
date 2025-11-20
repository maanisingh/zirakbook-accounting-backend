/**
 * Authentication Service
 * Business logic for user authentication operations
 */

import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateTokens, verifyRefreshToken } from '../utils/tokens.js';
import ApiError from '../utils/ApiError.js';
import { USER_STATUS, USER_ROLES, ERROR_CODES } from '../config/constants.js';
import { setCache, deleteCache } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and tokens
 */
export const register = async (userData) => {
  const { email, password, name, phone, role, companyId } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    throw ApiError.conflict(
      'User with this email already exists',
      ERROR_CODES.DB_DUPLICATE_ENTRY
    );
  }

  // Verify company exists and is active
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw ApiError.notFound('Company not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  if (!company.isActive) {
    throw ApiError.badRequest('Cannot register user for inactive company');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone: phone || null,
      role: role || USER_ROLES.VIEWER,
      status: USER_STATUS.ACTIVE,
      companyId
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      companyId: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // Generate tokens
  const tokens = generateTokens(user);

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken }
  });

  logger.info(`User registered successfully: ${user.email}`);

  return {
    user,
    tokens
  };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and tokens
 */
export const login = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw ApiError.invalidCredentials();
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw ApiError.invalidCredentials();
  }

  // Check user status
  if (user.status === USER_STATUS.INACTIVE) {
    throw ApiError.forbidden('Account is inactive. Please contact administrator.');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.accountSuspended();
  }

  // Check company status
  if (!user.company.isActive) {
    throw ApiError.forbidden('Company account is inactive');
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Update user login info and store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      refreshToken: tokens.refreshToken
    }
  });

  // Remove sensitive data
  const { password: _, refreshToken: __, ...userWithoutSensitiveData } = user;

  logger.info(`User logged in successfully: ${user.email}`);

  return {
    user: userWithoutSensitiveData,
    tokens
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token is required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user and verify refresh token matches
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  // Check user and company status
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Account is not active');
  }

  if (!user.company.isActive) {
    throw ApiError.forbidden('Company account is inactive');
  }

  // Generate new tokens
  const tokens = generateTokens(user);

  // Update refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken }
  });

  logger.info(`Access token refreshed for user: ${user.email}`);

  return { tokens };
};

/**
 * Logout user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const logout = async (userId) => {
  // Clear refresh token from database
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null }
  });

  // Clear cached permissions
  await deleteCache(`user:${userId}:permissions`);

  logger.info(`User logged out: ${userId}`);
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);

  if (!isPasswordValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear refresh token (force re-login)
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      refreshToken: null
    }
  });

  logger.info(`Password changed for user: ${user.email}`);
};

/**
 * Get current user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile data
 */
export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      lastLoginAt: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          logo: true,
          baseCurrency: true
        }
      }
    }
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};

/**
 * Verify user token is still valid
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if token is valid
 */
export const verifyToken = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      company: {
        select: {
          isActive: true
        }
      }
    }
  });

  if (!user) {
    return false;
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    return false;
  }

  if (!user.company.isActive) {
    return false;
  }

  return true;
};

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
  getCurrentUser,
  verifyToken
};
