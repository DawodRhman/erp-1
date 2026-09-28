import dotenv from 'dotenv';
import app from './src/app.js';
import pool from './src/config/db.js';
import { logger } from './src/utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message || String(reason) }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ message: error.message, stack: error.stack }, 'Uncaught Exception');
  process.exit(1);
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
});

server.on('error', (error) => {
  logger.error({ message: error.message, stack: error.stack }, 'Server Error');
  process.exit(1);
});

function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(() => {
    pool.end(() => {
      logger.info({}, 'Server and pool closed');
      process.exit(0);
    });
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

