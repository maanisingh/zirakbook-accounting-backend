/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

import { verifyAccessToken, extractTokenFromHeader } from '../utils/tokens.js';
import ApiError from '../utils/ApiError.js';
import { USER_STATUS } from '../config/constants.js';
import prisma from '../config/database.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Authenticate user with JWT token
 * Verifies token and attaches user data to request
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  // Verify token
  const decoded = verifyAccessToken(token);

  // Fetch user from database
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
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
    throw ApiError.unauthorized('User not found or has been deleted');
  }

  // Check if user account is active
  if (user.status === USER_STATUS.INACTIVE) {
    throw ApiError.forbidden('Account is inactive. Please contact administrator.');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.accountSuspended();
  }

  // Check if company is active
  if (!user.company.isActive) {
    throw ApiError.forbidden('Company account is inactive');
  }

  // Attach user to request
  req.user = user;
  next();
});

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't throw error if missing
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      if (user && user.status === USER_STATUS.ACTIVE && user.company.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
});

/**
 * Require specific role(s) for access
 * @param {string|string[]} roles - Required role or array of roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const userRole = req.user.role;
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(userRole)) {
      throw ApiError.insufficientPermissions(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Require company membership
 * Ensures user belongs to the company specified in params/body
 */
export const requireCompanyAccess = (paramName = 'companyId') => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const targetCompanyId = req.params[paramName] || req.body[paramName] || req.query[paramName];

    if (targetCompanyId && req.user.companyId !== targetCompanyId) {
      throw ApiError.forbidden('Access denied to this company resource');
    }

    next();
  };
};

/**
 * Require user to be the resource owner or admin
 * @param {string} paramName - Parameter name containing user ID
 */
export const requireOwnershipOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const targetUserId = req.params[paramName] || req.body[paramName];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = ['SUPERADMIN', 'COMPANY_ADMIN'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }

    next();
  };
};

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireCompanyAccess,
  requireOwnershipOrAdmin
};
