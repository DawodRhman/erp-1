import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

// Simple helper to convert number to words for invoice totals
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const n = Math.floor(num);
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  return `${inWords(n)} Rupees Only`;
}

export async function listClientTemplates(customerId = null) {
  let query = `SELECT t.*, c.customer_name FROM public.client_invoice_templates t LEFT JOIN public.customers c ON c.id = t.customer_id`;
  const params = [];
  if (customerId) {
    query += ` WHERE t.customer_id = $1`;
    params.push(customerId);
  }
  query += ` ORDER BY t.created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
}

export async function saveClientTemplate(data) {
  const result = await pool.query(
    `
      INSERT INTO public.client_invoice_templates (
        customer_id, template_name, tax_type, default_tax_rate, number_of_copies, custom_header, custom_footer, template_config
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING *
    `,
    [
      data.customer_id || null,
      data.template_name || 'Standard',
      data.tax_type || 'GST',
      data.default_tax_rate || 18.0,
      data.number_of_copies || 1,
      data.custom_header || null,
      data.custom_footer || null,
      JSON.stringify(data.template_config || {}),
    ]
  );
  return result.rows[0];
}

export async function createClientInvoiceFromDispatch(data) {
  // data: { dispatch_id, quotation_id, customer_id, template_name, currency, exchange_rate, tax_type, tax_rate, number_of_copies, notes }
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM public.customer_invoices`);
  const seq = (countRes.rows[0].total || 0) + 1;
  const invNum = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let itemsToInvoice = [];

    // Pull items from Dispatch if provided
    if (data.dispatch_id) {
      const dItems = await client.query(
        `
          SELECT di.*, p.product_name
          FROM public.installer_dispatch_items di
          LEFT JOIN public.products p ON p.id = di.product_id
          WHERE di.dispatch_id = $1 AND di.quantity_used > 0
        `,
        [data.dispatch_id]
      );
      itemsToInvoice = dItems.rows.map((r) => ({
        product_id: r.product_id,
        description: `${r.product_name || 'Service / Item'} (${r.quantity_used} ${r.unit_of_measure || 'units'})`,
        quantity: Number(r.quantity_used || 1),
        unit_price: Number(r.unit_price || 0),
      }));

      // Pull on-the-go purchases
      const dPurchases = await client.query(
        `SELECT * FROM public.installer_on_the_go_purchases WHERE dispatch_id = $1`,
        [data.dispatch_id]
      );
      dPurchases.rows.forEach((p) => {
        itemsToInvoice.push({
          product_id: null,
          description: `Field Expense / Material: ${p.item_description} (${p.vendor_name || 'Direct Shop'})`,
          quantity: 1,
          unit_price: Number(p.amount || 0),
        });
      });
    } else if (data.quotation_id) {
      const qItems = await client.query(
        `SELECT * FROM public.quotation_items WHERE quotation_id = $1`,
        [data.quotation_id]
      );
      itemsToInvoice = qItems.rows.map((r) => ({
        product_id: r.product_id,
        description: r.description,
        quantity: Number(r.quantity || 1),
        unit_price: Number(r.unit_price || 0),
      }));
    } else if (Array.isArray(data.items)) {
      itemsToInvoice = data.items;
    }

    const exRate = Number(data.exchange_rate || 1.0);
    const taxRatePct = Number(data.tax_rate || 18.0);
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = itemsToInvoice.map((item) => {
      const q = Number(item.quantity || 1);
      const p = Number(item.unit_price || 0) * exRate;
      const totalNoTax = q * p;
      const itemTax = (totalNoTax * taxRatePct) / 100;
      const totalWithTax = totalNoTax + itemTax;

      subtotal += totalNoTax;
      totalTax += itemTax;

      return {
        product_id: item.product_id || null,
        description: item.description,
        quantity: q,
        unit_price: p,
        total_without_tax: totalNoTax,
        tax_amount: itemTax,
        total_with_tax: totalWithTax,
      };
    });

    const grandTotal = subtotal + totalTax;
    const words = numberToWords(grandTotal);

    const invRes = await client.query(
      `
        INSERT INTO public.customer_invoices (
          invoice_number, dispatch_id, quotation_id, customer_id, currency, exchange_rate,
          template_name, tax_type, tax_rate, subtotal, tax_amount, total_amount,
          amount_in_words, number_of_copies, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ISSUED', $15)
        RETURNING *
      `,
      [
        invNum,
        data.dispatch_id || null,
        data.quotation_id || null,
        data.customer_id,
        data.currency || 'PKR',
        exRate,
        data.template_name || 'Standard',
        data.tax_type || 'GST',
        taxRatePct,
        subtotal,
        totalTax,
        grandTotal,
        words,
        data.number_of_copies || 1,
        data.notes || null,
      ]
    );
    const invoice = invRes.rows[0];

    for (const item of processedItems) {
      await client.query(
        `
          INSERT INTO public.customer_invoice_items (
            invoice_id, product_id, description, quantity, unit_price, total_without_tax, tax_amount, total_with_tax
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          invoice.id,
          item.product_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total_without_tax,
          item.tax_amount,
          item.total_with_tax,
        ]
      );
    }

    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listInvoices(filters = {}) {
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`i.status = $${params.length}`);
  }
  if (filters.customer_id) {
    params.push(filters.customer_id);
    where.push(`i.customer_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        i.*,
        c.customer_name
      FROM public.customer_invoices i
      LEFT JOIN public.customers c ON c.id = i.customer_id
      ${whereSql}
      ORDER BY i.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function getInvoiceById(id) {
  const iRes = await pool.query(
    `
      SELECT
        i.*,
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        c.address AS customer_address
      FROM public.customer_invoices i
      LEFT JOIN public.customers c ON c.id = i.customer_id
      WHERE i.id = $1
    `,
    [id]
  );
  if (!iRes.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

  const itemsRes = await pool.query(
    `SELECT * FROM public.customer_invoice_items WHERE invoice_id = $1`,
    [id]
  );

  return {
    ...iRes.rows[0],
    items: itemsRes.rows,
  };
}

export async function updateInvoiceStatus(id, status) {
  const result = await pool.query(
    `UPDATE public.customer_invoices SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
  return result.rows[0];
}
