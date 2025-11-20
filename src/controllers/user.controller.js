/**
 * User Controller
 * HTTP request handlers for user management endpoints
 */

import * as userService from '../services/user.service.js';
import * as permissionService from '../services/permission.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Create new user
 * @route POST /api/v1/users
 * @access Private (Admin only)
 */
export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user.id);

  ApiResponse.created(
    user,
    'User created successfully'
  ).send(res);
});

/**
 * Get all users with filters
 * @route GET /api/v1/users
 * @access Private
 */
export const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);

  ApiResponse.paginated(
    result.users,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Users retrieved successfully'
  ).send(res);
});

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 * @access Private
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  ApiResponse.success(
    user,
    'User retrieved successfully'
  ).send(res);
});

/**
 * Update user
 * @route PATCH /api/v1/users/:id
 * @access Private (Admin or Owner)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.params.id,
    req.body,
    req.user.id
  );

  ApiResponse.success(
    user,
    'User updated successfully'
  ).send(res);
});

/**
 * Delete user
 * @route DELETE /api/v1/users/:id
 * @access Private (Admin only)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.id);

  ApiResponse.success(
    null,
    'User deleted successfully'
  ).send(res);
});

/**
 * Activate user
 * @route POST /api/v1/users/:id/activate
 * @access Private (Admin only)
 */
export const activateUser = asyncHandler(async (req, res) => {
  const user = await userService.activateUser(req.params.id, req.user.id);

  ApiResponse.success(
    user,
    'User activated successfully'
  ).send(res);
});

/**
 * Deactivate user
 * @route POST /api/v1/users/:id/deactivate
 * @access Private (Admin only)
 */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.params.id, req.user.id);

  ApiResponse.success(
    user,
    'User deactivated successfully'
  ).send(res);
});

/**
 * Change user status
 * @route POST /api/v1/users/:id/status
 * @access Private (Admin only)
 */
export const changeUserStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const user = await userService.changeUserStatus(
    req.params.id,
    status,
    req.user.id,
    reason
  );

  ApiResponse.success(
    user,
    'User status changed successfully'
  ).send(res);
});

/**
 * Get user statistics
 * @route GET /api/v1/users/stats
 * @access Private (Admin only)
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats(req.query.companyId);

  ApiResponse.success(
    stats,
    'User statistics retrieved successfully'
  ).send(res);
});

/**
 * Get user permissions
 * @route GET /api/v1/users/:id/permissions
 * @access Private
 */
export const getUserPermissions = asyncHandler(async (req, res) => {
  const permissions = await permissionService.getUserPermissions(req.params.id);

  ApiResponse.success(
    permissions,
    'User permissions retrieved successfully'
  ).send(res);
});

/**
 * Assign permissions to user
 * @route POST /api/v1/users/:id/permissions
 * @access Private (Admin only)
 */
export const assignPermissions = asyncHandler(async (req, res) => {
  const { permissionIds } = req.body;
  const result = await permissionService.assignPermissionsToUser(
    req.params.id,
    permissionIds,
    req.user.id
  );

  ApiResponse.success(
    result,
    'Permissions assigned successfully'
  ).send(res);
});

/**
 * Revoke permissions from user
 * @route DELETE /api/v1/users/:id/permissions
 * @access Private (Admin only)
 */
export const revokePermissions = asyncHandler(async (req, res) => {
  const { permissionIds } = req.body;
  const result = await permissionService.revokePermissionsFromUser(
    req.params.id,
    permissionIds,
    req.user.id
  );

  ApiResponse.success(
    result,
    'Permissions revoked successfully'
  ).send(res);
});

export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  changeUserStatus,
  getUserStats,
  getUserPermissions,
  assignPermissions,
  revokePermissions
};
