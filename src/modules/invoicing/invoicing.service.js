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

function toAmount(value, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

async function getPublicTableColumns(tableName) {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function nextCustomerInvoiceNumber(client) {
  const seqResult = await client.query(`SELECT nextval('public.customer_invoice_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;
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
  const invoiceColumns = await getPublicTableColumns('customer_invoices');
  const idempotencyKey = String(data.idempotency_key || '').trim() || null;

  if (idempotencyKey && invoiceColumns.has('idempotency_key')) {
    const existing = await pool.query(`SELECT * FROM public.customer_invoices WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existing.rows[0]) return existing.rows[0];
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invNum = await nextCustomerInvoiceNumber(client);

    let itemsToInvoice = [];

    // Prefer explicit builder rows so finance can edit/add items before saving.
    // The dispatch_id / quotation_id still stay linked on the invoice record.
    if (Array.isArray(data.items) && data.items.length) {
      itemsToInvoice = data.items;
    } else if (data.dispatch_id) {
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
        description: r.description || r.item_description || r.product_name || 'Service / Item',
        quantity: Number(r.quantity || 1),
        unit_price: Number(r.unit_price || 0),
      }));
    }

    const exRate = Number(data.exchange_rate || 1.0);
    const taxRatePct = Number(data.tax_rate || 18.0);
    let subtotal = 0;
    let totalTax = 0;

    const processedItems = itemsToInvoice.map((item) => {
      const q = toAmount(item.quantity, 1);
      const p = toAmount(item.unit_price, 0) * exRate;
      const computedNoTax = q * p;
      const totalNoTax = item.total_without_tax !== undefined
        ? toAmount(item.total_without_tax, computedNoTax)
        : computedNoTax;
      const computedTax = (totalNoTax * taxRatePct) / 100;
      const itemTax = item.tax_amount !== undefined
        ? toAmount(item.tax_amount, computedTax)
        : computedTax;
      const totalWithTax = item.total_with_tax !== undefined
        ? toAmount(item.total_with_tax, totalNoTax + itemTax)
        : totalNoTax + itemTax;

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

    const invoiceValues = {
      invoice_number: invNum,
      dispatch_id: data.dispatch_id || null,
      quotation_id: data.quotation_id || null,
      customer_id: data.customer_id,
      currency: data.currency || 'PKR',
      exchange_rate: exRate,
      template_name: data.template_name || 'Standard',
      tax_type: data.tax_type || 'GST',
      tax_rate: taxRatePct,
      subtotal,
      tax_amount: totalTax,
      total_amount: grandTotal,
      amount_in_words: words,
      number_of_copies: data.number_of_copies || 1,
      status: data.status || 'DRAFT',
      notes: data.notes || null,
      idempotency_key: idempotencyKey,
    };
    const insertColumns = Object.keys(invoiceValues).filter((column) => invoiceColumns.has(column));
    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const invRes = await client.query(
      `
        INSERT INTO public.customer_invoices (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `,
      insertColumns.map((column) => invoiceValues[column]),
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

function parseInvoiceNotes(notes) {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

export async function listInvoiceSummaries(filters = {}) {
  const params = [];
  const where = [];

  if (filters.customer_id) {
    params.push(filters.customer_id);
    where.push(`s.customer_id = $${params.length}`);
  }
  if (filters.summary_type) {
    params.push(filters.summary_type);
    where.push(`s.summary_type = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT s.*, c.customer_name
      FROM public.customer_invoice_summaries s
      LEFT JOIN public.customers c ON c.id = s.customer_id
      ${whereSql}
      ORDER BY s.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function createInvoiceSummary({
  customer_id,
  summary_period,
  summary_type = 'operational_expenses',
  summary_limit = 2000000,
  invoice_ids = [],
  notes = null,
}) {
  if (!customer_id) throw new AppError(400, 'VALIDATION_ERROR', 'Customer is required for summary.');
  const allowedTypes = new Set([
    'operational_expenses',
    'capital_expenses',
    'footage_expenses',
    'rental_expenses',
  ]);
  const normalizedType = allowedTypes.has(summary_type) ? summary_type : 'operational_expenses';
  const editableLimit = toAmount(summary_limit, 2000000);
  const params = [customer_id];
  const where = [`customer_id = $1`];

  if (Array.isArray(invoice_ids) && invoice_ids.length) {
    params.push(invoice_ids);
    where.push(`id = ANY($${params.length}::uuid[])`);
  }

  const invoicesRes = await pool.query(
    `
      SELECT id, invoice_number, customer_id, subtotal, tax_amount, total_amount, status, notes
      FROM public.customer_invoices
      WHERE ${where.join(' AND ')}
      ORDER BY created_at ASC
    `,
    params
  );

  const invoices = invoicesRes.rows;
  if (!invoices.length) {
    throw new AppError(404, 'NOT_FOUND', 'No invoices found for this client summary.');
  }

  const subtotal = invoices.reduce((sum, invoice) => sum + toAmount(invoice.subtotal), 0);
  const taxAmount = invoices.reduce((sum, invoice) => sum + toAmount(invoice.tax_amount), 0);
  const totalAmount = invoices.reduce((sum, invoice) => sum + toAmount(invoice.total_amount), 0);
  const isOverLimit = editableLimit > 0 && totalAmount > editableLimit;
  if (isOverLimit) {
    throw new AppError(
      400,
      'SUMMARY_LIMIT_EXCEEDED',
      `Summary total exceeds the configured limit of ${editableLimit}.`
    );
  }
  const branchBreakdown = invoices.map((invoice, index) => {
    const meta = parseInvoiceNotes(invoice.notes);
    return {
      sr_no: index + 1,
      branch_name: meta.branch_name || '-',
      branch_code: meta.branch_code || '-',
      ticket_number: meta.purchase_order_no || '-',
      invoice_number: invoice.invoice_number,
      subtotal: toAmount(invoice.subtotal),
      tax_amount: toAmount(invoice.tax_amount),
      total_amount: toAmount(invoice.total_amount),
      status: invoice.status,
    };
  });

  const result = await pool.query(
    `
      WITH inserted AS (
        INSERT INTO public.customer_invoice_summaries (
          customer_id, summary_period, summary_type, summary_limit, is_over_limit,
          invoice_ids, invoice_numbers, subtotal, tax_amount, total_amount,
          branch_breakdown, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid[], $7::jsonb, $8, $9, $10, $11::jsonb, $12, $13)
        RETURNING *
      )
      SELECT inserted.*, c.customer_name
      FROM inserted
      LEFT JOIN public.customers c ON c.id = inserted.customer_id
    `,
    [
      customer_id,
      summary_period || 'Monthly Client Summary',
      normalizedType,
      editableLimit,
      isOverLimit,
      invoices.map((invoice) => invoice.id),
      JSON.stringify(invoices.map((invoice) => invoice.invoice_number)),
      subtotal,
      taxAmount,
      totalAmount,
      JSON.stringify(branchBreakdown),
      'DRAFT',
      notes,
    ]
  );

  return result.rows[0];
}

export async function getInvoiceById(id) {
  const customerColumns = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customers'
    `
  );
  const customerColumnSet = new Set(customerColumns.rows.map((row) => row.column_name));
  const iRes = await pool.query(
    `
      SELECT
        i.*,
        c.customer_name,
        ${customerColumnSet.has('email') ? 'c.email' : 'NULL'} AS customer_email,
        ${customerColumnSet.has('phone') ? 'c.phone' : 'NULL'} AS customer_phone,
        ${customerColumnSet.has('address') ? 'c.address' : 'NULL'} AS customer_address
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

export async function updateClientInvoice(id, data) {
  const current = await getInvoiceById(id);
  const currentNotes = parseInvoiceNotes(current.notes);
  const nextNotes = {
    ...currentNotes,
    ...(data.notes ? parseInvoiceNotes(data.notes) : {}),
  };
  const items = Array.isArray(data.items) ? data.items : current.items;
  const taxRate = toAmount(data.tax_rate, current.tax_rate || 0);
  let subtotal = 0;
  let totalTax = 0;

  const processedItems = items.map((item) => {
    const quantity = toAmount(item.quantity, 0);
    const unitPrice = toAmount(item.unit_price, 0);
    const computedSubtotal = quantity * unitPrice;
    const totalWithoutTax = item.total_without_tax !== undefined
      ? toAmount(item.total_without_tax, computedSubtotal)
      : computedSubtotal;
    const computedTax = (totalWithoutTax * taxRate) / 100;
    const taxAmount = item.tax_amount !== undefined ? toAmount(item.tax_amount, computedTax) : computedTax;
    const totalWithTax = item.total_with_tax !== undefined
      ? toAmount(item.total_with_tax, totalWithoutTax + taxAmount)
      : totalWithoutTax + taxAmount;
    subtotal += totalWithoutTax;
    totalTax += taxAmount;
    return {
      product_id: item.product_id || null,
      description: item.description || 'Invoice item',
      quantity,
      unit_price: unitPrice,
      total_without_tax: totalWithoutTax,
      tax_amount: taxAmount,
      total_with_tax: totalWithTax,
    };
  });

  const totalAmount = subtotal + totalTax;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceRes = await client.query(
      `
        UPDATE public.customer_invoices
        SET invoice_number = $2,
            tax_rate = $3,
            subtotal = $4,
            tax_amount = $5,
            total_amount = $6,
            amount_in_words = $7,
            number_of_copies = $8,
            status = $9,
            notes = $10,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        data.invoice_number || current.invoice_number,
        taxRate,
        subtotal,
        totalTax,
        totalAmount,
        data.amount_in_words || numberToWords(totalAmount),
        data.number_of_copies || current.number_of_copies || 1,
        data.status || current.status || 'DRAFT',
        JSON.stringify(nextNotes),
      ]
    );

    await client.query(`DELETE FROM public.customer_invoice_items WHERE invoice_id = $1`, [id]);
    for (const item of processedItems) {
      await client.query(
        `
          INSERT INTO public.customer_invoice_items (
            invoice_id, product_id, description, quantity, unit_price, total_without_tax, tax_amount, total_with_tax
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          id,
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
    return invoiceRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    if (err?.code === '23505' && idempotencyKey && invoiceColumns.has('idempotency_key')) {
      const existing = await pool.query(`SELECT * FROM public.customer_invoices WHERE idempotency_key = $1`, [idempotencyKey]);
      if (existing.rows[0]) return existing.rows[0];
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInvoiceStatus(id, status) {
  const result = await pool.query(
    `UPDATE public.customer_invoices SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
  return result.rows[0];
}
