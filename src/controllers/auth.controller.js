/**
 * Authentication Controller
 * HTTP request handlers for authentication endpoints
 */

import * as authService from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Register new user
 * @route POST /api/v1/auth/register
 * @access Public
 */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  ApiResponse.created(
    result,
    'User registered successfully'
  ).send(res);
});

/**
 * Login user
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  ApiResponse.success(
    result,
    'Login successful'
  ).send(res);
});

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);

  ApiResponse.success(
    result,
    'Token refreshed successfully'
  ).send(res);
});

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);

  ApiResponse.success(
    null,
    'Logout successful'
  ).send(res);
});

/**
 * Get current user profile
 * @route GET /api/v1/auth/me
 * @access Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  ApiResponse.success(
    user,
    'User profile retrieved successfully'
  ).send(res);
});

/**
 * Change password
 * @route POST /api/v1/auth/change-password
 * @access Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword
  );

  ApiResponse.success(
    null,
    'Password changed successfully. Please login again.'
  ).send(res);
});

/**
 * Verify token
 * @route GET /api/v1/auth/verify
 * @access Private
 */
export const verifyToken = asyncHandler(async (req, res) => {
  const isValid = await authService.verifyToken(req.user.id);

  ApiResponse.success(
    { valid: isValid },
    'Token is valid'
  ).send(res);
});

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  verifyToken
};
