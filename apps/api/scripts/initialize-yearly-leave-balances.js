import 'dotenv/config';
import pool from '../src/config/db.js';
import { initializeYearlyBalances } from '../src/modules/leave/leave.service.js';

const LOCK_ID = 20241201; // Unique lock ID for the rollover script

const suppliedYear = process.argv[2];
const year = suppliedYear ? Number(suppliedYear) : new Date().getFullYear();

if (!Number.isInteger(year) || year < 2020 || year > 2100) {
  console.error('Provide a valid leave year between 2020 and 2100.');
  process.exitCode = 1;
} else {
  try {
    // Acquire PostgreSQL advisory lock to prevent concurrent executions
    const lockResult = await pool.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_ID]);
    if (!lockResult.rows[0]?.locked) {
      console.error('Another instance of the leave rollover script is already running. Exiting.');
      process.exitCode = 1;
      await pool.end();
      process.exit();
    }

    const result = await initializeYearlyBalances(year);
    console.log(
      `Leave rollover ${result.year}: processed ${result.employees_processed} employees, created ${result.balances_created} balances.`
    );
  } catch (error) {
    console.error('Unable to initialize yearly leave balances.', error);
    process.exitCode = 1;
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    await pool.end();
  }
}
