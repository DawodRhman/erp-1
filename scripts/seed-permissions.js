import pool from '../src/config/db.js';

const permissionKeys = [
  'calendar:read',
  'calendar:write',
  'notifications:read',
  'notifications:write',
  'alerts:read',
  'pending_actions:read',
  'penalty_rules:write',
  'penalties:propose',
  'penalties:review',
  'penalties:read_own',
  'penalties:read_all',
  'leave_capacity:write',
  'leave_capacity:read',
  'directory:read',
  'directory:write',
  'config:read',
  'config:write',
  'attendance:submit_ho',
  'attendance:unlock',
  'attendance:read',
  'attendance:write',
  'leave:read',
  'leave:write',
  'leave:approve',
  'employees:read',
  'employees:write',
  'dashboard:read',
];

async function seedPermissions() {
  try {
    for (const key of permissionKeys) {
      const result = await pool.query(
        `
        WITH ins AS (
          INSERT INTO public.permissions (permission_key, description)
          VALUES ($1, $2)
          ON CONFLICT (permission_key) DO NOTHING
          RETURNING permission_key
        )
        SELECT EXISTS (SELECT 1 FROM ins) AS inserted;
      `,
        [key, `Permission for ${key}`]
      );

      if (result.rows[0]?.inserted) {
        console.log(`[INSERTED] ${key}`);
      } else {
        console.log(`[SKIPPED] ${key}`);
      }
    }

    console.log('Permission seeding completed.');
  } finally {
    await pool.end();
  }
}

seedPermissions().catch((error) => {
  console.error('Permission seeding failed:', error.message);
  process.exitCode = 1;
});
