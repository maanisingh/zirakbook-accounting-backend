/**
 * Redis Configuration
 * Redis Client Singleton for caching and session management
 */

import Redis from 'ioredis';
import logger from './logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 10,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 10000
};

// Create Redis client singleton
let redis;
try {
  redis = new Redis(redisConfig);
} catch (error) {
  logger.error('Failed to create Redis client:', error);
  redis = null;
}

// Event handlers
if (redis) {
  redis.on('connect', () => {
    logger.info('Redis client connected');
  });

  redis.on('ready', () => {
    logger.info('Redis client ready');
  });

  redis.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await redis.quit();
    logger.info('Redis disconnected');
  });

  process.on('SIGTERM', async () => {
    await redis.quit();
    logger.info('Redis disconnected');
  });
}

// Helper functions
export const setCache = async (key, value, expiryInSeconds = 3600) => {
  if (!redis) return false;
  try {
    await redis.setex(key, expiryInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

export const getCache = async (key) => {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

export const deleteCache = async (key) => {
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

export const deleteCachePattern = async (pattern) => {
  if (!redis) return false;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis delete pattern error:', error);
    return false;
  }
};

export default redis;
