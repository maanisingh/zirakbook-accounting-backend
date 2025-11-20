/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown
 */

import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';
import prisma from './config/database.js';
import redis from './config/redis.js';
import { handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Server configuration
const PORT = process.env.PORT || 8003;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Test Redis connection (optional)
    if (redis) {
      try {
        await redis.connect();
        await redis.ping();
        logger.info('Redis connected successfully');
      } catch (error) {
        logger.warn('Redis connection failed, continuing without cache:', error.message);
      }
    } else {
      logger.warn('Redis client not initialized, continuing without cache');
    }

    // Start listening
    server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ZirakBook Accounting System API                         ║
║                                                            ║
║   Server Status: RUNNING                                  ║
║   Environment: ${NODE_ENV.padEnd(44)}║
║   Port: ${String(PORT).padEnd(50)}║
║   Time: ${new Date().toISOString().padEnd(50)}║
║                                                            ║
║   Base URL: http://localhost:${PORT.toString().padEnd(33)}║
║   API Docs: http://localhost:${PORT}/api/docs${' '.repeat(21)}║
║   Health Check: http://localhost:${PORT}/api/health${' '.repeat(16)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed');

        // Close Redis connection
        if (redis) {
          try {
            await redis.quit();
            logger.info('Redis connection closed');
          } catch (error) {
            logger.warn('Error closing Redis connection:', error.message);
          }
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default app;
