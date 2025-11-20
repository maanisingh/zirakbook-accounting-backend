/**
 * JWT Token Utilities
 * Token generation and verification for access and refresh tokens
 */

import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants.js';
import ApiError from './ApiError.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

/**
 * Generate access token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(
      payload,
      JWT_SECRET,
      {
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE
      }
    );
  } catch (error) {
    throw ApiError.internal('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(
      payload,
      JWT_REFRESH_SECRET,
      {
        expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE
      }
    );
  } catch (error) {
    throw ApiError.internal('Failed to generate refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing access and refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    status: user.status
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  return {
    accessToken,
    refreshToken
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {ApiError} If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.tokenExpired();
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.invalidToken();
    }
    throw ApiError.unauthorized('Token verification failed');
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {ApiError} If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.tokenExpired();
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.invalidToken();
    }
    throw ApiError.unauthorized('Refresh token verification failed');
  }
};

/**
 * Decode token without verification (for inspection only)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader
};
