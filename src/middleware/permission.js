/**
 * Permission Checking Middleware
 * Verifies user has required permissions for specific actions
 */

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/database.js';
import { getCache, setCache } from '../config/redis.js';
import { CACHE_KEYS, CACHE_TTL, USER_ROLES } from '../config/constants.js';

/**
 * Get user permissions from database or cache
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user permissions
 */
const getUserPermissions = async (userId) => {
  // Try to get from cache first
  const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);
  const cachedPermissions = await getCache(cacheKey);

  if (cachedPermissions) {
    return cachedPermissions;
  }

  // Fetch from database
  const userPermissions = await prisma.userPermission.findMany({
    where: {
      userId,
      granted: true
    },
    include: {
      permission: true
    }
  });

  const permissions = userPermissions.map((up) => ({
    module: up.permission.module,
    action: up.permission.action,
    resource: up.permission.resource
  }));

  // Cache the permissions
  await setCache(cacheKey, permissions, CACHE_TTL.MEDIUM);

  return permissions;
};

/**
 * Check if user has specific permission
 * @param {Array} userPermissions - User's permissions array
 * @param {string} module - Module name
 * @param {string} action - Action name
 * @param {string} resource - Resource name
 * @returns {boolean} True if user has permission
 */
const hasPermission = (userPermissions, module, action, resource) => {
  return userPermissions.some(
    (perm) =>
      perm.module === module &&
      perm.action === action &&
      perm.resource === resource
  );
};

/**
 * Require specific permission middleware
 * @param {string} module - Module name (e.g., 'inventory', 'sales')
 * @param {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @param {string} resource - Resource name (e.g., 'products', 'invoices')
 */
export const requirePermission = (module, action, resource) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Superadmins bypass permission checks
    if (req.user.role === USER_ROLES.SUPERADMIN) {
      return next();
    }

    // Get user permissions
    const userPermissions = await getUserPermissions(req.user.id);

    // Check if user has the required permission
    if (!hasPermission(userPermissions, module, action, resource)) {
      throw ApiError.insufficientPermissions(
        `You do not have permission to ${action} ${resource} in ${module} module`
      );
    }

    next();
  });
};

/**
 * Require any of the specified permissions (OR logic)
 * @param {Array<Object>} permissions - Array of permission objects { module, action, resource }
 */
export const requireAnyPermission = (permissions) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Superadmins bypass permission checks
    if (req.user.role === USER_ROLES.SUPERADMIN) {
      return next();
    }

    // Get user permissions
    const userPermissions = await getUserPermissions(req.user.id);

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((perm) =>
      hasPermission(userPermissions, perm.module, perm.action, perm.resource)
    );

    if (!hasAnyPermission) {
      throw ApiError.insufficientPermissions(
        'You do not have sufficient permissions to perform this action'
      );
    }

    next();
  });
};

/**
 * Require all of the specified permissions (AND logic)
 * @param {Array<Object>} permissions - Array of permission objects { module, action, resource }
 */
export const requireAllPermissions = (permissions) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Superadmins bypass permission checks
    if (req.user.role === USER_ROLES.SUPERADMIN) {
      return next();
    }

    // Get user permissions
    const userPermissions = await getUserPermissions(req.user.id);

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every((perm) =>
      hasPermission(userPermissions, perm.module, perm.action, perm.resource)
    );

    if (!hasAllPermissions) {
      throw ApiError.insufficientPermissions(
        'You do not have all required permissions to perform this action'
      );
    }

    next();
  });
};

/**
 * Check permission without middleware (utility function)
 * @param {string} userId - User ID
 * @param {string} module - Module name
 * @param {string} action - Action name
 * @param {string} resource - Resource name
 * @returns {Promise<boolean>} True if user has permission
 */
export const checkPermission = async (userId, module, action, resource) => {
  // Get user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    return false;
  }

  // Superadmins have all permissions
  if (user.role === USER_ROLES.SUPERADMIN) {
    return true;
  }

  const userPermissions = await getUserPermissions(userId);
  return hasPermission(userPermissions, module, action, resource);
};

export default {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  checkPermission
};
