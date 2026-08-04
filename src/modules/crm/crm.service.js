import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

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

async function nextQuotationNumber(client) {
  const seqResult = await client.query(`SELECT nextval('public.crm_quotation_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `QT-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;
}

// --- Price Tiers ---
export async function setProductPriceTiers(productId, tiers = []) {
  // tiers: [{ tier_name: 'TIER_A', price: 100 }, ...]
  for (const t of tiers) {
    await pool.query(
      `
        INSERT INTO public.product_price_tiers (product_id, tier_name, price)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, tier_name)
        DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
      `,
      [productId, t.tier_name, t.price]
    );
  }
}

export async function getProductPriceTiers(productId) {
  const result = await pool.query(
    `SELECT tier_name, price FROM public.product_price_tiers WHERE product_id = $1`,
    [productId]
  );
  return result.rows;
}

// --- Leads ---
export async function listLeads(filters = {}) {
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`l.status = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(l.title ILIKE $${params.length} OR l.contact_name ILIKE $${params.length} OR c.customer_name ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        l.*,
        c.customer_name,
        u.email AS assigned_to_email
      FROM public.crm_leads l
      LEFT JOIN public.customers c ON c.id = l.customer_id
      LEFT JOIN public.users u ON u.id = l.assigned_to
      ${whereSql}
      ORDER BY l.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function createLead(data) {
  const result = await pool.query(
    `
      INSERT INTO public.crm_leads (title, customer_id, contact_name, contact_email, contact_phone, status, assigned_to, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      data.title,
      data.customer_id || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.status || 'NEW',
      data.assigned_to || null,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

export async function updateLead(id, data) {
  const fields = [];
  const params = [id];

  const allowed = ['title', 'customer_id', 'contact_name', 'contact_email', 'contact_phone', 'status', 'assigned_to', 'notes'];
  allowed.forEach((col) => {
    if (data[col] !== undefined) {
      params.push(data[col]);
      fields.push(`${col} = $${params.length}`);
    }
  });

  if (!fields.length) throw new AppError(400, 'NO_FIELDS', 'No fields to update.');
  params.push(new Date());
  fields.push(`updated_at = $${params.length}`);

  const result = await pool.query(
    `UPDATE public.crm_leads SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return result.rows[0];
}

// --- Quotations ---
export async function listQuotations(filters = {}) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const hasLeadId = quoteColumns.has('lead_id');
  const quoteNumberExpr = quoteColumns.has('quotation_number')
    ? 'q.quotation_number'
    : quoteColumns.has('quotation_id')
      ? 'q.quotation_id'
      : 'q.id::text';
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`q.status = $${params.length}`);
  }
  if (filters.customer_id) {
    params.push(filters.customer_id);
    where.push(`q.customer_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        q.*,
        ${quoteNumberExpr} AS quotation_number,
        ${hasLeadId ? 'l.title' : 'NULL'} AS lead_title,
        ${quoteColumns.has('price_tier') ? 'q.price_tier' : "'Standard'"} AS price_tier,
        ${quoteColumns.has('template_style') ? 'q.template_style' : "'HBL Sales Tax Invoice'"} AS template_style,
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      ${hasLeadId ? 'LEFT JOIN public.crm_leads l ON l.id = q.lead_id' : ''}
      ${whereSql}
      ORDER BY q.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function getQuotationById(id) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const customerColumns = await getPublicTableColumns('customers');
  const quoteNumberExpr = quoteColumns.has('quotation_number')
    ? 'q.quotation_number'
    : quoteColumns.has('quotation_id')
      ? 'q.quotation_id'
      : 'q.id::text';
  const qResult = await pool.query(
    `
      SELECT
        q.*,
        ${quoteNumberExpr} AS quotation_number,
        ${quoteColumns.has('price_tier') ? 'q.price_tier' : "'Standard'"} AS price_tier,
        ${quoteColumns.has('template_style') ? 'q.template_style' : "'HBL Sales Tax Invoice'"} AS template_style,
        c.customer_name,
        ${customerColumns.has('email') ? 'c.email' : 'NULL'} AS customer_email,
        ${customerColumns.has('phone') ? 'c.phone' : 'NULL'} AS customer_phone,
        ${customerColumns.has('address') ? 'c.address' : 'NULL'} AS customer_address
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      WHERE q.id = $1
    `,
    [id]
  );
  if (!qResult.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');

  const itemsResult = await pool.query(
    `
      SELECT qi.*, p.product_name
      FROM public.quotation_items qi
      LEFT JOIN public.products p ON p.id = qi.product_id
      WHERE qi.quotation_id = $1
    `,
    [id]
  );

  return {
    ...qResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function createQuotation(data) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const itemColumns = await getPublicTableColumns('quotation_items');
  const idempotencyKey = String(data.idempotency_key || '').trim() || null;

  if (idempotencyKey && quoteColumns.has('idempotency_key')) {
    const existing = await pool.query(`SELECT * FROM public.quotations WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existing.rows[0]) return existing.rows[0];
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteNum = await nextQuotationNumber(client);

    let subtotal = 0;
    const items = data.items || [];
    for (const item of items) {
      subtotal += Number(item.quantity || 1) * Number(item.unit_price || 0);
    }

    const taxAmount = Number(data.tax_amount || 0);
    const totalAmount = subtotal + taxAmount;

    const quoteValues = {
      quotation_number: quoteNum,
      quotation_id: quoteNum,
      lead_id: data.lead_id || null,
      customer_id: data.customer_id,
      price_tier: data.price_tier || 'TIER_A',
      currency: data.currency || 'PKR',
      exchange_rate: data.exchange_rate || 1.0,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      template_style: data.template_style || 'HBL Sales Tax Invoice',
      status: 'DRAFT',
      terms: data.terms || 'Payment within 30 days of quotation approval.',
      notes: data.notes || null,
      idempotency_key: idempotencyKey,
    };
    const insertColumns = Object.keys(quoteValues).filter((column) => quoteColumns.has(column));
    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const qRes = await client.query(
      `
        INSERT INTO public.quotations (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `,
      insertColumns.map((column) => quoteValues[column]),
    );
    const quotation = qRes.rows[0];

    for (const item of items) {
      const description = item.description || item.item_description || item.product_name || null;
      const hasProduct = Boolean(item.product_id);
      if (!hasProduct && !description) continue;

      const itemValues = {
        quotation_id: quotation.id,
        product_id: item.product_id || null,
        description,
        item_description: description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: Number(item.quantity || 1) * Number(item.unit_price || 0),
      };
      const itemInsertColumns = Object.keys(itemValues).filter((column) => itemColumns.has(column));
      const itemPlaceholders = itemInsertColumns.map((_, index) => `$${index + 1}`).join(', ');
      await client.query(
        `
          INSERT INTO public.quotation_items (${itemInsertColumns.join(', ')})
          VALUES (${itemPlaceholders})
        `,
        itemInsertColumns.map((column) => itemValues[column]),
      );
    }

    // Update lead status if lead_id provided
    if (data.lead_id && quoteColumns.has('lead_id')) {
      await client.query(`UPDATE public.crm_leads SET status = 'QUOTED' WHERE id = $1`, [data.lead_id]);
    }

    await client.query('COMMIT');
    return quotation;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err?.code === '23505' && idempotencyKey && quoteColumns.has('idempotency_key')) {
      const existing = await pool.query(`SELECT * FROM public.quotations WHERE idempotency_key = $1`, [idempotencyKey]);
      if (existing.rows[0]) return existing.rows[0];
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuotationStatus(id, status, userId = null) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const fields = ['status = $2'];
  const params = [id, status];

  if (quoteColumns.has('updated_at')) {
    fields.push('updated_at = NOW()');
  }
  if (status === 'APPROVED' && quoteColumns.has('approved_at')) {
    fields.push('approved_at = NOW()');
  }
  if (status === 'APPROVED' && userId && quoteColumns.has('approved_by')) {
    params.push(userId);
    fields.push(`approved_by = $${params.length}`);
  }

  const result = await pool.query(
    `UPDATE public.quotations SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');
  return result.rows[0];
}
