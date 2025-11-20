/**
 * Global Error Handler Middleware
 * Catches and formats all errors in the application
 */

import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * Handle Prisma errors
 * @param {Error} error - Prisma error
 * @returns {ApiError} Formatted API error
 */
const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return ApiError.conflict(
        `A record with this ${field} already exists`,
        ERROR_CODES.DB_DUPLICATE_ENTRY
      );
    }

    // Record not found
    if (error.code === 'P2025') {
      return ApiError.notFound(
        'The requested record was not found',
        ERROR_CODES.DB_RECORD_NOT_FOUND
      );
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return ApiError.badRequest(
        'Invalid reference to related record',
        ERROR_CODES.DB_FOREIGN_KEY_CONSTRAINT
      );
    }

    // Record to delete does not exist
    if (error.code === 'P2018') {
      return ApiError.notFound(
        'The record to delete does not exist',
        ERROR_CODES.DB_RECORD_NOT_FOUND
      );
    }

    // Database connection error
    if (error.code === 'P1001') {
      return ApiError.internal('Database connection failed', 'DB_CONNECTION_ERROR');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return ApiError.badRequest(
      'Invalid data provided',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  return ApiError.internal('Database operation failed', 'DB_ERROR');
};

/**
 * Handle JWT errors
 * @param {Error} error - JWT error
 * @returns {ApiError} Formatted API error
 */
const handleJWTError = (error) => {
  if (error.name === 'TokenExpiredError') {
    return ApiError.tokenExpired();
  }

  if (error.name === 'JsonWebTokenError') {
    return ApiError.invalidToken();
  }

  return ApiError.unauthorized('Token verification failed');
};

/**
 * Convert error to ApiError
 * @param {Error} error - Error object
 * @returns {ApiError} API error instance
 */
const convertToApiError = (error) => {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError) {
    return handlePrismaError(error);
  }

  // JWT errors
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    return handleJWTError(error);
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return ApiError.badRequest(
      error.message,
      ERROR_CODES.VALIDATION_ERROR,
      error.details
    );
  }

  // Default to internal server error
  return ApiError.internal(
    process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error.message
  );
};

/**
 * Log error with appropriate level
 * @param {ApiError} error - API error
 * @param {Object} req - Express request object
 */
const logError = (error, req) => {
  const errorLog = {
    message: error.message,
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    stack: error.stack
  };

  // Log based on status code
  if (error.statusCode >= 500) {
    logger.error('Server Error:', errorLog);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error:', errorLog);
  } else {
    logger.info('Error:', errorLog);
  }
};

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Convert to ApiError if needed
  const error = convertToApiError(err);

  // Log the error
  logError(error, req);

  // Prepare error response
  const response = {
    success: false,
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    message: error.message
  };

  // Add validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Send error response
  res.status(error.statusCode).json(response);
};

/**
 * Handle 404 Not Found
 * Should be placed before error handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = ApiError.notFound(
    `Route ${req.method} ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in production
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Exit the process as the application state is unreliable
    process.exit(1);
  });
};

export default errorHandler;
