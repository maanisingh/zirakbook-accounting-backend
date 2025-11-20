/**
 * Routes Index
 * Aggregates all route modules
 */

import express from 'express';
import authRoutes from './v1/auth.route.js';
import userRoutes from './v1/user.route.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZirakBook API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * API v1 routes
 */
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);

/**
 * API info endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ZirakBook Accounting System API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users'
    }
  });
});

export default router;
