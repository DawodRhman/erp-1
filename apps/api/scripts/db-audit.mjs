import 'dotenv/config';
import { Pool } from 'pg';

const requiredTables = [
  'users',
  'roles',
  'permissions',
  'customers',
  'crm_leads',
  'quotations',
  'quotation_items',
  'products',
  'inventory_items',
  'purchase_orders',
  'invoices',
  'tracker_installations',
  'customer_invoices',
  'customer_invoice_items',
  'customer_invoice_summaries',
  'installer_field_dispatches',
];

const summaryColumns = ['summary_type', 'summary_limit', 'is_over_limit'];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

try {
  const tableResult = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)",
    [requiredTables],
  );
  const existingTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !existingTables.has(table));

  const columnResult = await pool.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'customer_invoice_summaries' and column_name = any($1)",
    [summaryColumns],
  );
  const existingSummaryColumns = new Set(columnResult.rows.map((row) => row.column_name));
  const missingSummaryColumns = summaryColumns.filter((column) => !existingSummaryColumns.has(column));

  const migrationTableResult = await pool.query(
    "select count(*)::int total from information_schema.tables where table_schema = 'public' and table_name = 'pgmigrations'",
  );
  let migrationRows = null;
  if (migrationTableResult.rows[0].total) {
    const migrationResult = await pool.query('select count(*)::int total from public.pgmigrations');
    migrationRows = migrationResult.rows[0].total;
  }

  console.log(
    JSON.stringify({
      ok: true,
      missingTables,
      missingSummaryColumns,
      migrationRows,
    }),
  );
} finally {
  await pool.end();
}
