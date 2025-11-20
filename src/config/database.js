/**
 * Database Configuration
 * Prisma Client Singleton
 */

import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'query', emit: 'event' }
    ],
    errorFormat: 'pretty'
  });
};

// Singleton pattern for Prisma Client
const globalForPrisma = global;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Log Prisma events
prisma.$on('warn', (e) => logger.warn('Prisma Warning:', e));
prisma.$on('error', (e) => logger.error('Prisma Error:', e));
prisma.$on('info', (e) => logger.info('Prisma Info:', e.message));
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  }
});

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
  process.exit(0);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
