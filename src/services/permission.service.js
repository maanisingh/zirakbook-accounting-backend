/**
 * Permission Service
 * Business logic for permission management operations
 */

import prisma from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { ERROR_CODES, USER_ROLES } from '../config/constants.js';
import { deleteCache } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Create a new permission
 * @param {Object} permissionData - Permission data
 * @returns {Promise<Object>} Created permission
 */
export const createPermission = async (permissionData) => {
  const { module, action, resource, description } = permissionData;

  // Check if permission already exists
  const existingPermission = await prisma.permission.findUnique({
    where: {
      module_action_resource: {
        module,
        action,
        resource
      }
    }
  });

  if (existingPermission) {
    throw ApiError.conflict(
      'Permission with this combination already exists',
      ERROR_CODES.DB_DUPLICATE_ENTRY
    );
  }

  // Create permission
  const permission = await prisma.permission.create({
    data: {
      module,
      action,
      resource,
      description
    }
  });

  logger.info(`Permission created: ${module}.${action}.${resource}`);

  return permission;
};

/**
 * Get all permissions
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} List of permissions
 */
export const getPermissions = async (filters = {}) => {
  const { module, action, resource } = filters;

  const where = {};

  if (module) {
    where.module = module;
  }

  if (action) {
    where.action = action;
  }

  if (resource) {
    where.resource = resource;
  }

  const permissions = await prisma.permission.findMany({
    where,
    orderBy: [
      { module: 'asc' },
      { resource: 'asc' },
      { action: 'asc' }
    ]
  });

  return permissions;
};

/**
 * Get permission by ID
 * @param {string} permissionId - Permission ID
 * @returns {Promise<Object>} Permission data
 */
export const getPermissionById = async (permissionId) => {
  const permission = await prisma.permission.findUnique({
    where: { id: permissionId },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!permission) {
    throw ApiError.notFound('Permission not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  return permission;
};

/**
 * Update permission
 * @param {string} permissionId - Permission ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated permission
 */
export const updatePermission = async (permissionId, updateData) => {
  const { description } = updateData;

  // Check if permission exists
  const existingPermission = await prisma.permission.findUnique({
    where: { id: permissionId }
  });

  if (!existingPermission) {
    throw ApiError.notFound('Permission not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Update permission (only description can be updated)
  const permission = await prisma.permission.update({
    where: { id: permissionId },
    data: { description }
  });

  logger.info(`Permission updated: ${permissionId}`);

  return permission;
};

/**
 * Delete permission
 * @param {string} permissionId - Permission ID
 * @returns {Promise<void>}
 */
export const deletePermission = async (permissionId) => {
  // Check if permission exists
  const permission = await prisma.permission.findUnique({
    where: { id: permissionId },
    include: {
      users: true
    }
  });

  if (!permission) {
    throw ApiError.notFound('Permission not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Check if permission is assigned to any users
  if (permission.users.length > 0) {
    throw ApiError.badRequest(
      'Cannot delete permission that is assigned to users. Remove assignments first.'
    );
  }

  // Delete permission
  await prisma.permission.delete({
    where: { id: permissionId }
  });

  logger.info(`Permission deleted: ${permissionId}`);
};

/**
 * Assign permissions to user
 * @param {string} userId - User ID
 * @param {Array<string>} permissionIds - Array of permission IDs
 * @param {string} grantedBy - ID of user granting permissions
 * @returns {Promise<Object>} Assignment result
 */
export const assignPermissionsToUser = async (userId, permissionIds, grantedBy) => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true }
  });

  if (!user) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Don't assign permissions to superadmin (they have all permissions by default)
  if (user.role === USER_ROLES.SUPERADMIN) {
    throw ApiError.badRequest('Cannot assign permissions to superadmin users');
  }

  // Verify all permissions exist
  const permissions = await prisma.permission.findMany({
    where: {
      id: { in: permissionIds }
    }
  });

  if (permissions.length !== permissionIds.length) {
    throw ApiError.badRequest('One or more permission IDs are invalid');
  }

  // Create or update user permissions
  const assignments = await Promise.all(
    permissionIds.map((permissionId) =>
      prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId
          }
        },
        create: {
          userId,
          permissionId,
          granted: true,
          grantedBy
        },
        update: {
          granted: true,
          grantedAt: new Date(),
          grantedBy
        }
      })
    )
  );

  // Clear cached permissions
  await deleteCache(`user:${userId}:permissions`);

  logger.info(`Permissions assigned to user ${userId} by ${grantedBy}`);

  return {
    userId,
    assignedCount: assignments.length,
    permissions: permissions.map((p) => ({
      id: p.id,
      module: p.module,
      action: p.action,
      resource: p.resource
    }))
  };
};

/**
 * Revoke permissions from user
 * @param {string} userId - User ID
 * @param {Array<string>} permissionIds - Array of permission IDs
 * @param {string} revokedBy - ID of user revoking permissions
 * @returns {Promise<Object>} Revocation result
 */
export const revokePermissionsFromUser = async (userId, permissionIds, revokedBy) => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Delete user permissions
  const result = await prisma.userPermission.deleteMany({
    where: {
      userId,
      permissionId: { in: permissionIds }
    }
  });

  // Clear cached permissions
  await deleteCache(`user:${userId}:permissions`);

  logger.info(`Permissions revoked from user ${userId} by ${revokedBy}`);

  return {
    userId,
    revokedCount: result.count
  };
};

/**
 * Get user permissions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User's permissions
 */
export const getUserPermissions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: {
        where: { granted: true },
        include: {
          permission: true
        }
      }
    }
  });

  if (!user) {
    throw ApiError.notFound('User not found', ERROR_CODES.DB_RECORD_NOT_FOUND);
  }

  // Superadmins have all permissions
  if (user.role === USER_ROLES.SUPERADMIN) {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions.map((p) => ({
      id: p.id,
      module: p.module,
      action: p.action,
      resource: p.resource,
      description: p.description,
      granted: true,
      grantedAt: null,
      source: 'role'
    }));
  }

  return user.permissions.map((up) => ({
    id: up.permission.id,
    module: up.permission.module,
    action: up.permission.action,
    resource: up.permission.resource,
    description: up.permission.description,
    granted: up.granted,
    grantedAt: up.grantedAt,
    source: 'explicit'
  }));
};

/**
 * Bulk create permissions
 * @param {Array<Object>} permissionsData - Array of permission objects
 * @returns {Promise<Object>} Creation result
 */
export const bulkCreatePermissions = async (permissionsData) => {
  const created = [];
  const skipped = [];

  for (const permData of permissionsData) {
    try {
      const permission = await createPermission(permData);
      created.push(permission);
    } catch (error) {
      if (error.errorCode === ERROR_CODES.DB_DUPLICATE_ENTRY) {
        skipped.push(permData);
      } else {
        throw error;
      }
    }
  }

  logger.info(`Bulk permission creation: ${created.length} created, ${skipped.length} skipped`);

  return {
    created,
    skipped,
    total: permissionsData.length
  };
};

/**
 * Get permissions grouped by module
 * @returns {Promise<Object>} Permissions grouped by module
 */
export const getPermissionsGroupedByModule = async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { resource: 'asc' },
      { action: 'asc' }
    ]
  });

  // Group by module
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  return grouped;
};

export default {
  createPermission,
  getPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  assignPermissionsToUser,
  revokePermissionsFromUser,
  getUserPermissions,
  bulkCreatePermissions,
  getPermissionsGroupedByModule
};
