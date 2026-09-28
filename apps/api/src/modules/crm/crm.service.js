import { randomUUID } from 'node:crypto';
import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { recordActivityLog } from '../audit/audit.service.js';

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
  return `QT-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

async function ensureCrmOrderInfrastructure(client = pool) {
  await client.query(`CREATE SEQUENCE IF NOT EXISTS public.crm_order_number_seq`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.crm_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(100) NOT NULL UNIQUE,
      quotation_id UUID NOT NULL UNIQUE REFERENCES public.quotations(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      token_number VARCHAR(100) UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
      created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`ALTER TABLE public.crm_orders ALTER COLUMN token_number DROP NOT NULL`);
  await client.query(`ALTER TABLE public.crm_orders ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW'`);
  await client.query(`
    ALTER TABLE public.crm_orders
      ADD COLUMN IF NOT EXISTS sales_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS technical_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS client_signoff_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS client_signoff_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS client_signoff_name TEXT,
      ADD COLUMN IF NOT EXISTS client_signoff_note TEXT
  `);
  await client.query(`
    ALTER TABLE public.quotations
      ADD COLUMN IF NOT EXISTS sales_handoff_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS technical_handoff_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS client_signoff_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS client_signoff_name TEXT,
      ADD COLUMN IF NOT EXISTS client_signoff_note TEXT
  `);
}

async function nextOrderNumber(client) {
  const seqResult = await client.query(`SELECT nextval('public.crm_order_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `ORD-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

async function ensureOrdersForApprovedQuotations(client = pool) {
  await ensureCrmOrderInfrastructure(client);
  const year = new Date().getUTCFullYear();
  await client.query(
    `
      WITH approved_without_order AS (
        SELECT q.id AS quotation_id, q.customer_id
        FROM public.quotations q
        LEFT JOIN public.crm_orders o ON o.quotation_id = q.id
        WHERE q.status = 'APPROVED'
          AND o.id IS NULL
        ORDER BY q.created_at ASC, q.id ASC
      ),
      numbered AS (
        SELECT
          quotation_id,
          customer_id,
          nextval('public.crm_order_number_seq')::int AS seq
        FROM approved_without_order
      )
      INSERT INTO public.crm_orders (
        order_number, quotation_id, customer_id, token_number, status,
        sales_status, technical_status, client_signoff_status
      )
      SELECT
        'ORD-' || $1::text || '-' || LPAD(seq::text, 4, '0'),
        quotation_id,
        customer_id,
        NULL,
        'PENDING_REVIEW',
        'ACCEPTED',
        'PENDING',
        'PENDING'
      FROM numbered
      ON CONFLICT (quotation_id) DO NOTHING
    `,
    [year],
  );
  await client.query(`
    UPDATE public.quotations q
    SET sales_handoff_at = COALESCE(q.sales_handoff_at, NOW()), updated_at = NOW()
    WHERE q.status = 'APPROVED'
      AND EXISTS (SELECT 1 FROM public.crm_orders o WHERE o.quotation_id = q.id)
      AND q.sales_handoff_at IS NULL
  `);
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
  if (filters.search) {
    params.push(`%${String(filters.search).trim()}%`);
    where.push(`(${quoteNumberExpr} ILIKE $${params.length} OR c.customer_name ILIKE $${params.length} OR q.status ILIKE $${params.length})`);
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
        ${quoteColumns.has('client_approval_token') ? 'q.client_approval_token' : 'NULL'} AS client_approval_token,
        ${quoteColumns.has('sent_at') ? 'q.sent_at' : 'NULL'} AS sent_at,
        ${quoteColumns.has('client_approved_at') ? 'q.client_approved_at' : 'NULL'} AS client_approved_at,
        ${quoteColumns.has('tax_rate') ? 'q.tax_rate' : 'CASE WHEN q.subtotal > 0 THEN ROUND((q.tax_amount / q.subtotal) * 100, 2) ELSE 0 END'} AS tax_rate,
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        COALESCE(item_stats.item_count, 0)::int AS item_count,
        linked_order.id AS order_id,
        linked_order.order_number,
        linked_order.status AS order_status
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      ${hasLeadId ? 'LEFT JOIN public.crm_leads l ON l.id = q.lead_id' : ''}
      LEFT JOIN (
        SELECT quotation_id, COUNT(*) AS item_count
        FROM public.quotation_items
        GROUP BY quotation_id
      ) item_stats ON item_stats.quotation_id = q.id
      LEFT JOIN LATERAL (
        SELECT o.id, o.order_number, o.status
        FROM public.crm_orders o
        WHERE o.quotation_id = q.id
        ORDER BY o.created_at ASC
        LIMIT 1
      ) linked_order ON TRUE
      ${whereSql}
      ORDER BY
        COALESCE(NULLIF(SUBSTRING(${quoteNumberExpr} FROM '([0-9]+)$'), '')::int, 2147483647) ASC,
        q.created_at ASC
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
        ${quoteColumns.has('tax_rate') ? 'q.tax_rate' : 'CASE WHEN q.subtotal > 0 THEN ROUND((q.tax_amount / q.subtotal) * 100, 2) ELSE 0 END'} AS tax_rate,
        c.customer_name,
        ${customerColumns.has('email') ? 'c.email' : 'NULL'} AS customer_email,
        ${customerColumns.has('phone') ? 'c.phone' : 'NULL'} AS customer_phone,
        ${customerColumns.has('address') ? 'c.address' : 'NULL'} AS customer_address,
        linked_order.id AS order_id,
        linked_order.order_number,
        linked_order.status AS order_status
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      LEFT JOIN LATERAL (
        SELECT o.id, o.order_number, o.status
        FROM public.crm_orders o
        WHERE o.quotation_id = q.id
        ORDER BY o.created_at ASC
        LIMIT 1
      ) linked_order ON TRUE
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

function normalizeQuotationItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const description = item.description || item.item_description || item.product_name || '';
      return {
        product_id: item.product_id || null,
        description: String(description).trim(),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unit_price: Math.max(0, Number(item.unit_price || 0)),
      };
    })
    .filter((item) => item.product_id || item.description);
}

function computeQuotationTotals(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const tax_amount = (subtotal * Number(taxRate || 0)) / 100;
  return {
    subtotal,
    tax_amount,
    total_amount: subtotal + tax_amount,
  };
}

async function insertQuotationItems(client, quotationId, items, itemColumns) {
  for (const item of items) {
    const itemValues = {
      quotation_id: quotationId,
      product_id: item.product_id || null,
      description: item.description,
      item_description: item.description,
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
}

export async function createQuotation(data) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const itemColumns = await getPublicTableColumns('quotation_items');
  const idempotencyKey = String(data.idempotency_key || '').trim() || null;

  if (idempotencyKey && quoteColumns.has('idempotency_key')) {
    const existing = await pool.query(`SELECT * FROM public.quotations WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existing.rows[0]) return getQuotationById(existing.rows[0].id);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteNum = await nextQuotationNumber(client);

    const items = normalizeQuotationItems(data.items || []);
    const taxRate = Number(data.tax_rate ?? 18);
    const totals = computeQuotationTotals(items, taxRate);
    const taxAmount = data.tax_amount !== undefined ? Number(data.tax_amount || 0) : totals.tax_amount;
    const totalAmount = totals.subtotal + taxAmount;
    const requestedStatus = String(data.status || 'DRAFT').toUpperCase();
    const status = ['DRAFT', 'MANAGEMENT_PENDING', 'MANAGEMENT_APPROVED', 'SENT'].includes(requestedStatus) ? requestedStatus : 'DRAFT';

    const quoteValues = {
      quotation_number: quoteNum,
      quotation_id: quoteNum,
      lead_id: data.lead_id || null,
      customer_id: data.customer_id,
      price_tier: data.price_tier || 'TIER_A',
      currency: data.currency || 'PKR',
      exchange_rate: data.exchange_rate || 1.0,
      subtotal: totals.subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tax_rate: taxRate,
      template_style: data.template_style || 'HBL Sales Tax Invoice',
      status,
      approval_stage: status === 'DRAFT' ? 'CRM_DRAFT' : status,
      terms: data.terms || 'Payment within 30 days of quotation approval.',
      notes: data.notes || null,
      idempotency_key: idempotencyKey,
      client_approval_token: randomUUID(),
      sent_at: status === 'SENT' ? new Date() : null,
      created_by: data.created_by || null,
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

    await insertQuotationItems(client, quotation.id, items, itemColumns);
    await recordActivityLog({ userId: data.created_by, action: 'CRM_QUOTATION_CREATED', entityType: 'quotations',
      entityId: quotation.id, meta: { quotation_number: quoteNum, status, total_amount: totalAmount }, db: client });

    // Update lead status if lead_id provided
    if (data.lead_id && quoteColumns.has('lead_id')) {
      await client.query(`UPDATE public.crm_leads SET status = 'QUOTED' WHERE id = $1`, [data.lead_id]);
    }

    await client.query('COMMIT');
    return getQuotationById(quotation.id);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err?.code === '23505' && idempotencyKey && quoteColumns.has('idempotency_key')) {
      const existing = await pool.query(`SELECT * FROM public.quotations WHERE idempotency_key = $1`, [idempotencyKey]);
      if (existing.rows[0]) return getQuotationById(existing.rows[0].id);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuotation(id, data, actorId = null) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const itemColumns = await getPublicTableColumns('quotation_items');
  const items = normalizeQuotationItems(data.items || []);
  const taxRate = Number(data.tax_rate ?? 18);
  const totals = computeQuotationTotals(items, taxRate);
  const taxAmount = data.tax_amount !== undefined ? Number(data.tax_amount || 0) : totals.tax_amount;
  const totalAmount = totals.subtotal + taxAmount;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM public.quotations WHERE id = $1 FOR UPDATE', [id]);
    const quote = existing.rows[0];
    if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');
    if (String(quote.status || '').toUpperCase() === 'APPROVED') {
      throw new AppError(409, 'QUOTATION_LOCKED', 'Approved quotations cannot be edited. Create a revision instead.');
    }
    if (quote.email_delivery_status === 'SENDING') {
      throw new AppError(409, 'EMAIL_IN_PROGRESS', 'Please wait for email sending to finish before editing the quotation.');
    }

    const quoteValues = {
      customer_id: data.customer_id,
      price_tier: data.price_tier || quote.price_tier || 'TIER_A',
      currency: data.currency || quote.currency || 'PKR',
      exchange_rate: data.exchange_rate || quote.exchange_rate || 1.0,
      subtotal: totals.subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tax_rate: taxRate,
      template_style: data.template_style || quote.template_style || 'HBL Sales Tax Invoice',
      terms: data.terms || quote.terms || 'Payment within 30 days of quotation approval.',
      notes: data.notes || null,
      status: String(data.status || quote.status || 'DRAFT').toUpperCase(),
      email_delivery_status: 'NOT_SENT',
      email_error: null,
      email_error_code: null,
    };
  const allowedStatuses = ['DRAFT', 'MANAGEMENT_PENDING', 'MANAGEMENT_APPROVED', 'SENT', 'REJECTED', 'EXPIRED'];
    if (!allowedStatuses.includes(quoteValues.status)) quoteValues.status = quote.status || 'DRAFT';
    if (quoteValues.status === 'SENT' && quoteColumns.has('sent_at')) quoteValues.sent_at = quote.sent_at || new Date();

    const updateColumns = Object.keys(quoteValues).filter((column) => quoteColumns.has(column));
    if (quoteColumns.has('updated_at')) {
      updateColumns.push('updated_at');
      quoteValues.updated_at = new Date();
    }
    const sets = updateColumns.map((column, index) => `${column} = $${index + 2}`);
    await client.query(
      `UPDATE public.quotations SET ${sets.join(', ')} WHERE id = $1`,
      [id, ...updateColumns.map((column) => quoteValues[column])],
    );

    await client.query('DELETE FROM public.quotation_items WHERE quotation_id = $1', [id]);
    await insertQuotationItems(client, id, items, itemColumns);
    await recordActivityLog({ userId: actorId, action: 'CRM_QUOTATION_UPDATED', entityType: 'quotations',
      entityId: id, meta: { status: quoteValues.status, total_amount: totalAmount }, db: client });

    await client.query('COMMIT');
    return getQuotationById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuotationStatus(id, status, userId = null, data = {}) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const nextStatus = String(status || '').toUpperCase();
  const allowedStatuses = ['DRAFT', 'MANAGEMENT_PENDING', 'MANAGEMENT_APPROVED', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new AppError(400, 'INVALID_QUOTATION_STATUS', 'Valid quotation statuses are DRAFT, MANAGEMENT_PENDING, MANAGEMENT_APPROVED, SENT, APPROVED, REJECTED and EXPIRED.');
  }
  const fields = ['status = $2'];
  const params = [id, nextStatus];

  if (quoteColumns.has('updated_at')) {
    fields.push('updated_at = NOW()');
  }
  if (nextStatus === 'SENT' && quoteColumns.has('sent_at')) {
    fields.push('sent_at = COALESCE(sent_at, NOW())');
  }
  if (quoteColumns.has('approval_stage')) {
    params.push(nextStatus === 'DRAFT' ? 'CRM_DRAFT' : nextStatus);
    fields.push(`approval_stage = $${params.length}`);
  }
  if (nextStatus === 'MANAGEMENT_APPROVED' && quoteColumns.has('management_approved_at')) {
    fields.push('management_approved_at = NOW()');
  }
  if (nextStatus === 'MANAGEMENT_APPROVED' && userId && quoteColumns.has('management_approved_by')) {
    params.push(userId);
    fields.push(`management_approved_by = $${params.length}`);
  }
  if (nextStatus === 'MANAGEMENT_APPROVED' && data.management_approval_note && quoteColumns.has('management_approval_note')) {
    params.push(String(data.management_approval_note).trim());
    fields.push(`management_approval_note = $${params.length}`);
  }
  if (nextStatus === 'SENT' && quoteColumns.has('client_approval_token')) {
    fields.push(`client_approval_token = COALESCE(client_approval_token, gen_random_uuid()::text)`);
  }
  if (nextStatus === 'APPROVED' && quoteColumns.has('approved_at')) {
    fields.push('approved_at = NOW()');
  }
  if (nextStatus === 'APPROVED' && quoteColumns.has('client_approved_at')) {
    fields.push('client_approved_at = COALESCE(client_approved_at, NOW())');
  }
  if (nextStatus === 'APPROVED' && userId && quoteColumns.has('approved_by')) {
    params.push(userId);
    fields.push(`approved_by = $${params.length}`);
  }
  if ((nextStatus === 'REJECTED' || nextStatus === 'APPROVED') && data.approval_remarks && quoteColumns.has('approval_remarks')) {
    params.push(data.approval_remarks);
    fields.push(`approval_remarks = $${params.length}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE public.quotations SET ${fields.join(', ')} WHERE id = $1
        AND (status <> 'APPROVED' OR $2::varchar = 'APPROVED') RETURNING *`, params
    );
    if (!result.rows[0]) throw new AppError(409, 'QUOTATION_LOCKED', 'Quotation not found or already approved; its decision cannot be changed.');
    await recordActivityLog({ userId, action: 'CRM_QUOTATION_STATUS_UPDATED', entityType: 'quotations',
      entityId: id, meta: { status: nextStatus }, db: client });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

export async function getPublicQuotationByToken(token) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const itemColumns = await getPublicTableColumns('quotation_items');
  if (!quoteColumns.has('client_approval_token')) {
    throw new AppError(404, 'NOT_FOUND', 'Client approval links are not enabled.');
  }

  const qResult = await pool.query(
    `
      SELECT
        q.id,
        ${quoteColumns.has('quotation_number') ? 'q.quotation_number' : quoteColumns.has('quotation_id') ? 'q.quotation_id AS quotation_number' : 'q.id::text AS quotation_number'},
        q.status,
        q.total_amount,
        ${quoteColumns.has('subtotal') ? 'q.subtotal' : 'NULL AS subtotal'},
        ${quoteColumns.has('tax_amount') ? 'q.tax_amount' : 'NULL AS tax_amount'},
        ${quoteColumns.has('tax_rate') ? 'q.tax_rate' : 'CASE WHEN q.subtotal > 0 THEN ROUND((q.tax_amount / q.subtotal) * 100, 2) ELSE 0 END'} AS tax_rate,
        ${quoteColumns.has('template_style') ? 'q.template_style' : "'Standard' AS template_style"},
        ${quoteColumns.has('sent_at') ? 'q.sent_at' : 'NULL AS sent_at'},
        ${quoteColumns.has('client_approved_at') ? 'q.client_approved_at' : 'NULL AS client_approved_at'},
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      WHERE q.client_approval_token = $1
    `,
    [token],
  );
  if (!qResult.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Quotation link not found.');
  if (!['SENT', 'APPROVED', 'REJECTED'].includes(qResult.rows[0].status)) {
    throw new AppError(409, 'QUOTATION_NOT_AVAILABLE', 'This quotation is not available for client review. Please contact CRM.');
  }

  const itemsResult = await pool.query(
    `
      SELECT
        qi.id,
        ${itemColumns.has('product_id') ? 'qi.product_id' : 'NULL'} AS product_id,
        COALESCE(
          ${itemColumns.has('description') ? 'qi.description' : 'NULL'},
          ${itemColumns.has('item_description') ? 'qi.item_description' : 'NULL'},
          p.product_name,
          'Quotation item'
        ) AS description,
        ${itemColumns.has('quantity') ? 'qi.quantity' : '1'} AS quantity,
        ${itemColumns.has('unit_price') ? 'qi.unit_price' : '0'} AS unit_price,
        ${itemColumns.has('total_price') ? 'qi.total_price' : itemColumns.has('quantity') && itemColumns.has('unit_price') ? '(qi.quantity * qi.unit_price)' : '0'} AS total_price,
        p.product_name
      FROM public.quotation_items qi
      LEFT JOIN public.products p ON p.id = ${itemColumns.has('product_id') ? 'qi.product_id' : 'NULL'}
      WHERE qi.quotation_id = $1
      ORDER BY qi.id
    `,
    [qResult.rows[0].id],
  );

  return {
    ...qResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function approvePublicQuotationByToken(token, data = {}) {
  return decidePublicQuotation(token, 'APPROVED', data.client_name || data.approval_remarks || null);
}

export async function rejectPublicQuotationByToken(token, data = {}) {
  const reason = String(data.rejection_reason || data.reason || '').trim();
  if (!reason) throw new AppError(422, 'REASON_MISSING', 'A rejection reason is mandatory.');
  return decidePublicQuotation(token, 'REJECTED', reason);
}

async function decidePublicQuotation(token, status, remarks) {
  if (remarks && String(remarks).length > 2000) throw new AppError(422, 'INVALID_REMARKS', 'Remarks must be 2000 characters or fewer.');
  const quoteColumns = await getPublicTableColumns('quotations');
  if (!quoteColumns.has('client_approval_token')) {
    throw new AppError(404, 'NOT_FOUND', 'Client approval links are not enabled.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM public.quotations WHERE client_approval_token = $1 FOR UPDATE', [token]);
    const quote = existing.rows[0];
    if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation link not found.');
    if (quote.status === status) {
      await client.query('COMMIT');
      return { id: quote.id, status, client_approved_at: quote.client_approved_at, approval_remarks: quote.approval_remarks };
    }
    if (quote.status !== 'SENT') throw new AppError(409, 'QUOTATION_CLOSED', 'This quotation is not awaiting approval or already has a final decision.');
    const fields = ['status = $2'];
    const params = [quote.id, status];
    if (quoteColumns.has('approval_remarks')) { params.push(remarks ? String(remarks).trim() : null); fields.push(`approval_remarks = $3`); }
    if (status === 'APPROVED' && quoteColumns.has('approved_at')) fields.push('approved_at = NOW()');
    if (status === 'APPROVED' && quoteColumns.has('client_approved_at')) fields.push('client_approved_at = NOW()');
    if (quoteColumns.has('client_reviewed_at')) fields.push('client_reviewed_at = NOW()');
    if (quoteColumns.has('updated_at')) fields.push('updated_at = NOW()');
    const result = await client.query(`UPDATE public.quotations SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, params);
    await recordActivityLog({ action: `CLIENT_QUOTATION_${status}`, entityType: 'quotations', entityId: quote.id,
      meta: { quotation_number: quote.quotation_number, previous_status: quote.status, status }, db: client });
    await client.query('COMMIT');
    if (status === 'APPROVED') await ensureOrdersForApprovedQuotations();
    const saved = result.rows[0];
    return { id: saved.id, status: saved.status, client_approved_at: saved.client_approved_at, approval_remarks: saved.approval_remarks };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

export async function listOrders(filters = {}) {
  await ensureOrdersForApprovedQuotations();
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`o.status = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(o.order_number ILIKE $${params.length} OR o.token_number ILIKE $${params.length} OR q.quotation_number ILIKE $${params.length} OR c.customer_name ILIKE $${params.length})`);
  }
  if (filters.customer_id) {
    params.push(filters.customer_id);
    where.push(`o.customer_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        o.*,
        q.quotation_number,
        q.total_amount,
        q.status AS quotation_status,
        c.customer_name,
        c.email AS customer_email,
        COALESCE(item_stats.item_count, 0)::int AS item_count
      FROM public.crm_orders o
      JOIN public.quotations q ON q.id = o.quotation_id
      LEFT JOIN public.customers c ON c.id = o.customer_id
      LEFT JOIN (
        SELECT quotation_id, COUNT(*) AS item_count
        FROM public.quotation_items
        GROUP BY quotation_id
      ) item_stats ON item_stats.quotation_id = q.id
      ${whereSql}
      ORDER BY o.created_at DESC
    `,
    params,
  );
  return result.rows;
}

export async function convertQuotationToOrder(id, userId = null) {
  await ensureCrmOrderInfrastructure();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureCrmOrderInfrastructure(client);

    const existing = await client.query(
      `
        SELECT
          o.*,
          q.quotation_number,
          q.total_amount,
          q.status AS quotation_status,
          c.customer_name,
          c.email AS customer_email,
          COALESCE(item_stats.item_count, 0)::int AS item_count
        FROM public.crm_orders o
        JOIN public.quotations q ON q.id = o.quotation_id
        LEFT JOIN public.customers c ON c.id = o.customer_id
        LEFT JOIN (
          SELECT quotation_id, COUNT(*) AS item_count
          FROM public.quotation_items
          GROUP BY quotation_id
        ) item_stats ON item_stats.quotation_id = q.id
        WHERE o.quotation_id = $1
      `,
      [id],
    );
    if (existing.rows[0]) {
      const accepted = await client.query(
        `
          UPDATE public.crm_orders
          SET sales_status = 'ACCEPTED', updated_at = NOW()
          WHERE quotation_id = $1
          RETURNING *
        `,
        [id],
      );
      await client.query(
        `UPDATE public.quotations SET sales_handoff_at = COALESCE(sales_handoff_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query('COMMIT');
      return { ...existing.rows[0], ...(accepted.rows[0] || {}) };
    }

    const quoteRes = await client.query(
      `
        SELECT q.*, c.customer_name
        FROM public.quotations q
        LEFT JOIN public.customers c ON c.id = q.customer_id
        WHERE q.id = $1
        FOR UPDATE OF q
      `,
      [id],
    );
    const quote = quoteRes.rows[0];
    if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');
    if (quote.status !== 'APPROVED') {
      throw new AppError(409, 'QUOTATION_NOT_APPROVED', 'Only approved quotations can be converted to orders.');
    }

    const orderNumber = await nextOrderNumber(client);
    const result = await client.query(
      `
        INSERT INTO public.crm_orders (
          order_number, quotation_id, customer_id, token_number, status, created_by,
          sales_status, technical_status, client_signoff_status
        )
        VALUES ($1, $2, $3, NULL, 'PENDING_REVIEW', $4, 'ACCEPTED', 'PENDING', 'PENDING')
        RETURNING *
      `,
      [orderNumber, quote.id, quote.customer_id, userId],
    );

    await client.query(
      `UPDATE public.quotations SET sales_handoff_at = COALESCE(sales_handoff_at, NOW()), updated_at = NOW() WHERE id = $1`,
      [quote.id],
    );

    await client.query('COMMIT');
    return {
      ...result.rows[0],
      quotation_number: quote.quotation_number || quote.quotation_id,
      total_amount: quote.total_amount,
      customer_name: quote.customer_name,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err?.code === '23505') {
      const existing = await pool.query(
        `
          SELECT o.*, q.quotation_number, q.total_amount, q.status AS quotation_status, c.customer_name
          FROM public.crm_orders o
          JOIN public.quotations q ON q.id = o.quotation_id
          LEFT JOIN public.customers c ON c.id = o.customer_id
          WHERE o.quotation_id = $1
        `,
        [id],
      );
      if (existing.rows[0]) return existing.rows[0];
    }
    throw err;
  } finally {
    client.release();
  }
}
