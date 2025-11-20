/**
 * Custom API Error Class
 * Standardized error handling with status codes and error codes
 */

import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

class ApiError extends Error {
  constructor(
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message = 'Internal Server Error',
    errorCode = 'INTERNAL_ERROR',
    errors = null,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.message = message;
    this.errors = errors;
    this.success = false;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Static factory methods for common errors
  static badRequest(message = 'Bad Request', errorCode = ERROR_CODES.VALIDATION_ERROR, errors = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, errorCode, errors);
  }

  static unauthorized(message = 'Unauthorized', errorCode = ERROR_CODES.AUTH_TOKEN_INVALID) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, errorCode);
  }

  static forbidden(message = 'Forbidden', errorCode = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = ERROR_CODES.DB_RECORD_NOT_FOUND) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, errorCode);
  }

  static conflict(message = 'Resource conflict', errorCode = ERROR_CODES.DB_DUPLICATE_ENTRY) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, errorCode);
  }

  static tooManyRequests(message = 'Too many requests', errorCode = 'RATE_LIMIT_EXCEEDED') {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, errorCode);
  }

  static internal(message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR') {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, errorCode);
  }

  static invalidCredentials() {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid email or password',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS
    );
  }

  static tokenExpired() {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Token has expired',
      ERROR_CODES.AUTH_TOKEN_EXPIRED
    );
  }

  static invalidToken() {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid or malformed token',
      ERROR_CODES.AUTH_TOKEN_INVALID
    );
  }

  static accountSuspended() {
    return new ApiError(
      HTTP_STATUS.FORBIDDEN,
      'Account has been suspended',
      ERROR_CODES.AUTH_ACCOUNT_SUSPENDED
    );
  }

  static insufficientPermissions(message = 'Insufficient permissions to perform this action') {
    return new ApiError(
      HTTP_STATUS.FORBIDDEN,
      message,
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
    );
  }
}

export default ApiError;
