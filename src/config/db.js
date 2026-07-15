import { Pool } from 'pg';
import 'dotenv/config';
import { logger } from '../utils/logger.js';

const useSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
});

pool.on('error', (err) => {
    logger.error({ message: err.message, stack: err.stack }, 'Unexpected database pool error');
});

export { pool };
export default pool;