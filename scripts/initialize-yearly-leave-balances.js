import 'dotenv/config';
import pool from '../src/config/db.js';
import { initializeYearlyBalances } from '../src/modules/leave/leave.service.js';

const suppliedYear = process.argv[2];
const year = suppliedYear ? Number(suppliedYear) : new Date().getFullYear();

if (!Number.isInteger(year) || year < 2020 || year > 2100) {
  console.error('Provide a valid leave year between 2020 and 2100.');
  process.exitCode = 1;
} else {
  try {
    const result = await initializeYearlyBalances(year);
    console.log(
      `Leave rollover ${result.year}: processed ${result.employees_processed} employees, created ${result.balances_created} balances.`
    );
  } catch (error) {
    console.error('Unable to initialize yearly leave balances.', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
