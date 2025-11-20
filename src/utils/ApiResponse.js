/**
 * Standardized API Response Class
 * Provides consistent response format across all endpoints
 */

import { HTTP_STATUS } from '../config/constants.js';

class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', metadata = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;

    if (metadata) {
      this.metadata = metadata;
    }
  }

  // Static factory methods for common responses
  static success(data = null, message = 'Operation successful', metadata = null) {
    return new ApiResponse(HTTP_STATUS.OK, data, message, metadata);
  }

  static created(data = null, message = 'Resource created successfully', metadata = null) {
    return new ApiResponse(HTTP_STATUS.CREATED, data, message, metadata);
  }

  static noContent(message = 'Operation completed successfully') {
    return new ApiResponse(HTTP_STATUS.NO_CONTENT, null, message);
  }

  static paginated(data, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);
    const metadata = {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    return new ApiResponse(HTTP_STATUS.OK, data, message, metadata);
  }

  // Send response to client
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      ...(this.metadata && { metadata: this.metadata })
    });
  }
}

export default ApiResponse;
