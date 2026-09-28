import fs from 'node:fs';
import pool from '../src/config/db.js';

const migrationUrl = new URL('../migrations/1782110021034_no_zero_value_dispatch_invoices.sql', import.meta.url);
const sql = fs.readFileSync(migrationUrl, 'utf8');

try {
  await pool.query(sql);
  const result = await pool.query(`
    SELECT
      i.invoice_number,
      i.status,
      i.total_amount,
      d.status AS dispatch_status,
      o.status AS order_status
    FROM public.customer_invoices i
    LEFT JOIN public.installer_field_dispatches d ON d.id = i.dispatch_id
    LEFT JOIN public.crm_orders o ON o.quotation_id = i.quotation_id
    WHERE COALESCE(i.total_amount, 0) <= 0
      AND COALESCE(i.notes, '') LIKE '%installer_returns%'
    ORDER BY i.created_at DESC
  `);
  console.log(JSON.stringify({ migration: 'applied', records: result.rows }, null, 2));
} finally {
  await pool.end();
}
