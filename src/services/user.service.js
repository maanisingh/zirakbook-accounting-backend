/**
 * User Service
 * Business logic for user management operations
 */

import prisma from '../config/database.js';
import { hashPassword } from '../utils/hash.js';
import ApiError from '../utils/ApiError.js';
import { USER_STATUS, USER_ROLES, ERROR_CODES, PAGINATION } from '../config/constants.js';
import { deleteCache, deleteCachePattern } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} createdBy - ID of user creating this user
 * @returns {Promise<Object>} Created user
 */
export const createUser = async (userData, createdBy) => {
  const { email, password, name, phone, role, status, companyId } = userData;

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

  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw ApiError.notFound('Company not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
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
      status: status || USER_STATUS.ACTIVE,
      companyId,
      createdBy
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  logger.info(`User created: ${user.email} by ${createdBy}`);

  return user;
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (userId) => {
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
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      permissions: {
        where: { granted: true },
        select: {
          permission: {
            select: {
              id: true,
              module: true,
              action: true,
              resource: true,
              description: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  return user;
};

/**
 * Get users list with filters and pagination
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} Users list with pagination
 */
export const getUsers = async (filters) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    companyId
  } = filters;

  // Build where clause
  const where = {};

  if (companyId) {
    where.companyId = companyId;
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = Math.min(limit, PAGINATION.MAX_LIMIT);

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
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
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return {
    users,
    pagination: {
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasNextPage: page < Math.ceil(total / take),
      hasPrevPage: page > 1
    }
  };
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {string} updatedBy - ID of user performing the update
 * @returns {Promise<Object>} Updated user
 */
export const updateUser = async (userId, updateData, updatedBy) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...updateData,
      updatedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      avatar: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // Clear cached permissions if role changed
  if (updateData.role) {
    await deleteCache(`user:${userId}:permissions`);
  }

  logger.info(`User updated: ${userId} by ${updatedBy}`);

  return user;
};

/**
 * Delete user
 * @param {string} userId - User ID
 * @param {string} deletedBy - ID of user performing the deletion
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId, deletedBy) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Prevent deletion of superadmin
  if (user.role === USER_ROLES.SUPERADMIN) {
    throw ApiError.forbidden('Cannot delete superadmin user');
  }

  // Prevent self-deletion
  if (userId === deletedBy) {
    throw ApiError.badRequest('Cannot delete your own account');
  }

  // Delete user (cascades to related records)
  await prisma.user.delete({
    where: { id: userId }
  });

  // Clear cached data
  await deleteCache(`user:${userId}:permissions`);

  logger.info(`User deleted: ${userId} by ${deletedBy}`);
};

/**
 * Activate user
 * @param {string} userId - User ID
 * @param {string} activatedBy - ID of user performing the activation
 * @returns {Promise<Object>} Updated user
 */
export const activateUser = async (userId, activatedBy) => {
  const user = await updateUser(
    userId,
    { status: USER_STATUS.ACTIVE },
    activatedBy
  );

  logger.info(`User activated: ${userId} by ${activatedBy}`);

  return user;
};

/**
 * Deactivate user
 * @param {string} userId - User ID
 * @param {string} deactivatedBy - ID of user performing the deactivation
 * @returns {Promise<Object>} Updated user
 */
export const deactivateUser = async (userId, deactivatedBy) => {
  // Prevent self-deactivation
  if (userId === deactivatedBy) {
    throw ApiError.badRequest('Cannot deactivate your own account');
  }

  const user = await updateUser(
    userId,
    { status: USER_STATUS.INACTIVE, refreshToken: null },
    deactivatedBy
  );

  logger.info(`User deactivated: ${userId} by ${deactivatedBy}`);

  return user;
};

/**
 * Suspend user
 * @param {string} userId - User ID
 * @param {string} reason - Suspension reason
 * @param {string} suspendedBy - ID of user performing the suspension
 * @returns {Promise<Object>} Updated user
 */
export const suspendUser = async (userId, reason, suspendedBy) => {
  // Prevent self-suspension
  if (userId === suspendedBy) {
    throw ApiError.badRequest('Cannot suspend your own account');
  }

  const user = await updateUser(
    userId,
    { status: USER_STATUS.SUSPENDED, refreshToken: null },
    suspendedBy
  );

  // Log suspension reason
  logger.warn(`User suspended: ${userId} by ${suspendedBy}. Reason: ${reason}`);

  return user;
};

/**
 * Change user status
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @param {string} changedBy - ID of user performing the change
 * @param {string} reason - Reason for status change
 * @returns {Promise<Object>} Updated user
 */
export const changeUserStatus = async (userId, status, changedBy, reason) => {
  switch (status) {
    case USER_STATUS.ACTIVE:
      return activateUser(userId, changedBy);
    case USER_STATUS.INACTIVE:
      return deactivateUser(userId, changedBy);
    case USER_STATUS.SUSPENDED:
      return suspendUser(userId, reason, changedBy);
    default:
      throw ApiError.badRequest('Invalid status value');
  }
};

/**
 * Get user statistics
 * @param {string} companyId - Company ID (optional)
 * @returns {Promise<Object>} User statistics
 */
export const getUserStats = async (companyId) => {
  const where = companyId ? { companyId } : {};

  const [total, active, inactive, suspended, byRole] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, status: USER_STATUS.ACTIVE } }),
    prisma.user.count({ where: { ...where, status: USER_STATUS.INACTIVE } }),
    prisma.user.count({ where: { ...where, status: USER_STATUS.SUSPENDED } }),
    prisma.user.groupBy({
      by: ['role'],
      where,
      _count: true
    })
  ]);

  return {
    total,
    byStatus: {
      active,
      inactive,
      suspended
    },
    byRole: byRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {})
  };
};

export default {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  suspendUser,
  changeUserStatus,
  getUserStats
};
