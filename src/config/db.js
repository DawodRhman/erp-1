import { Pool } from 'pg';
import 'dotenv/config';

const useSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export { pool };
export default pool;