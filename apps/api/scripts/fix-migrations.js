import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixMigrations() {
  try {
    // Get all migration files from the migrations directory
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const existingFiles = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).map((f) => f.replace('.sql', '').replace('.js', ''))
      : [];

    // Get all migrations from the database
    const { rows } = await pool.query('SELECT name FROM pgmigrations');
    const dbMigrations = rows.map((r) => r.name);

    // Find orphaned migrations
    const orphaned = dbMigrations.filter((name) => !existingFiles.includes(name));

    if (orphaned.length === 0) {
      console.log('✅ No orphaned migrations found in the database.');
    } else {
      const placeholders = orphaned.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(`DELETE FROM pgmigrations WHERE name IN (${placeholders})`, orphaned);
      console.log(`✅ Removed ${result.rowCount} orphaned migration(s): ${orphaned.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error fixing migrations:', error.message);
  } finally {
    await pool.end();
  }
}

fixMigrations();
