/**
 * User Validation Schemas
 * Joi validation for user management endpoints
 */

import Joi from 'joi';
import { USER_ROLES, USER_STATUS } from '../config/constants.js';

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

/**
 * Create user validation schema
 */
export const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .pattern(emailPattern)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.pattern.base': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),

  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number must be between 10 and 15 digits'
    }),

  role: Joi.string()
    .valid(...Object.values(USER_ROLES))
    .default(USER_ROLES.VIEWER)
    .messages({
      'any.only': 'Invalid role specified'
    }),

  status: Joi.string()
    .valid(...Object.values(USER_STATUS))
    .default(USER_STATUS.ACTIVE)
    .messages({
      'any.only': 'Invalid status specified'
    }),

  companyId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid company ID format',
      'any.required': 'Company ID is required'
    })
});

/**
 * Update user validation schema
 */
export const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number must be between 10 and 15 digits'
    }),

  role: Joi.string()
    .valid(...Object.values(USER_ROLES))
    .optional()
    .messages({
      'any.only': 'Invalid role specified'
    }),

  status: Joi.string()
    .valid(...Object.values(USER_STATUS))
    .optional()
    .messages({
      'any.only': 'Invalid status specified'
    }),

  avatar: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': 'Avatar must be a valid URL'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Get user by ID validation schema
 */
export const getUserByIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

/**
 * Get users list validation schema (query parameters)
 */
export const getUsersListSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),

  role: Joi.string()
    .valid(...Object.values(USER_ROLES))
    .optional()
    .messages({
      'any.only': 'Invalid role filter'
    }),

  status: Joi.string()
    .valid(...Object.values(USER_STATUS))
    .optional()
    .messages({
      'any.only': 'Invalid status filter'
    }),

  search: Joi.string()
    .trim()
    .optional()
    .allow(''),

  sortBy: Joi.string()
    .valid('name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt')
    .default('createdAt')
    .messages({
      'any.only': 'Invalid sort field'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    }),

  companyId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid company ID format'
    })
});

/**
 * Delete user validation schema
 */
export const deleteUserSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

/**
 * Activate/Deactivate user validation schema
 */
export const toggleUserStatusSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),

  status: Joi.string()
    .valid(USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED)
    .required()
    .messages({
      'any.only': 'Invalid status value',
      'any.required': 'Status is required'
    }),

  reason: Joi.string()
    .when('status', {
      is: USER_STATUS.SUSPENDED,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Reason is required when suspending a user'
    })
});

/**
 * Assign permissions validation schema
 */
export const assignPermissionsSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),

  permissionIds: Joi.array()
    .items(
      Joi.string().uuid().messages({
        'string.guid': 'Invalid permission ID format'
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission must be provided',
      'any.required': 'Permission IDs are required'
    })
});

/**
 * Revoke permissions validation schema
 */
export const revokePermissionsSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),

  permissionIds: Joi.array()
    .items(
      Joi.string().uuid().messages({
        'string.guid': 'Invalid permission ID format'
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission must be provided',
      'any.required': 'Permission IDs are required'
    })
});

export default {
  createUserSchema,
  updateUserSchema,
  getUserByIdSchema,
  getUsersListSchema,
  deleteUserSchema,
  toggleUserStatusSchema,
  assignPermissionsSchema,
  revokePermissionsSchema
};
