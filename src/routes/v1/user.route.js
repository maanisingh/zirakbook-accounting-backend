/**
 * User Routes
 * API routes for user management endpoints
 */

import express from 'express';
import * as userController from '../../controllers/user.controller.js';
import * as userValidation from '../../validations/user.validation.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { authenticate, requireRole, requireOwnershipOrAdmin } from '../../middleware/auth.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  userController.getUserStats
);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateBody(userValidation.createUserSchema),
  userController.createUser
);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with filters
 * @access  Private
 */
router.get(
  '/',
  validateQuery(userValidation.getUsersListSchema),
  userController.getUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(userValidation.getUserByIdSchema),
  userController.getUserById
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Private (Admin or Owner)
 */
router.patch(
  '/:id',
  validateParams(userValidation.getUserByIdSchema),
  validateBody(userValidation.updateUserSchema),
  requireOwnershipOrAdmin('id'),
  userController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateParams(userValidation.deleteUserSchema),
  userController.deleteUser
);

/**
 * @route   POST /api/v1/users/:id/activate
 * @desc    Activate user
 * @access  Private (Admin only)
 */
router.post(
  '/:id/activate',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateParams(userValidation.getUserByIdSchema),
  userController.activateUser
);

/**
 * @route   POST /api/v1/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (Admin only)
 */
router.post(
  '/:id/deactivate',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateParams(userValidation.getUserByIdSchema),
  userController.deactivateUser
);

/**
 * @route   POST /api/v1/users/:id/status
 * @desc    Change user status
 * @access  Private (Admin only)
 */
router.post(
  '/:id/status',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateParams(userValidation.getUserByIdSchema),
  validateBody(userValidation.toggleUserStatusSchema),
  userController.changeUserStatus
);

/**
 * @route   GET /api/v1/users/:id/permissions
 * @desc    Get user permissions
 * @access  Private
 */
router.get(
  '/:id/permissions',
  validateParams(userValidation.getUserByIdSchema),
  userController.getUserPermissions
);

/**
 * @route   POST /api/v1/users/:id/permissions
 * @desc    Assign permissions to user
 * @access  Private (Admin only)
 */
router.post(
  '/:id/permissions',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateBody(userValidation.assignPermissionsSchema),
  userController.assignPermissions
);

/**
 * @route   DELETE /api/v1/users/:id/permissions
 * @desc    Revoke permissions from user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id/permissions',
  requireRole(USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY_ADMIN),
  validateBody(userValidation.revokePermissionsSchema),
  userController.revokePermissions
);

export default router;
