import { Pool } from 'pg';
import 'dotenv/config';
import { logger } from '../utils/logger.js';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://root:%2A%2A%40%2F%23Abc1@103.65.248.160:5432/erp-srs-new';

const useSsl =
  process.env.DB_SSL === 'true' ||
  connectionString.includes('sslmode=require') ||
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase');

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
});

pool.on('error', (err) => {
  logger.error({ message: err.message, stack: err.stack }, 'Unexpected database pool error');
});

export { pool };
export default pool;