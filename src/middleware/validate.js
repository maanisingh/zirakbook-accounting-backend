/**
 * Request Validation Middleware
 * Validates request body, query, and params against Joi schemas
 */

import ApiError from '../utils/ApiError.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Validate request data against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return next(
        ApiError.badRequest(
          'Validation failed',
          ERROR_CODES.VALIDATION_ERROR,
          errors
        )
      );
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate request body
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate request route parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => validate(schema, 'params');

export default validate;
