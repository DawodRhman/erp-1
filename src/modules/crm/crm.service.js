import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

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
        c.customer_name,
        l.title AS lead_title
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      LEFT JOIN public.crm_leads l ON l.id = q.lead_id
      ${whereSql}
      ORDER BY q.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function getQuotationById(id) {
  const qResult = await pool.query(
    `
      SELECT
        q.*,
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        c.address AS customer_address
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
  // Generate Quotation Number e.g. QT-202607-001
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM public.quotations`);
  const seq = (countRes.rows[0].total || 0) + 1;
  const quoteNum = `QT-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const items = data.items || [];
    for (const item of items) {
      subtotal += Number(item.quantity || 1) * Number(item.unit_price || 0);
    }

    const taxAmount = Number(data.tax_amount || 0);
    const totalAmount = subtotal + taxAmount;

    const qRes = await client.query(
      `
        INSERT INTO public.quotations (
          quotation_number, lead_id, customer_id, price_tier, currency,
          exchange_rate, subtotal, tax_amount, total_amount, template_style, status, terms, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      [
        quoteNum,
        data.lead_id || null,
        data.customer_id,
        data.price_tier || 'TIER_A',
        data.currency || 'PKR',
        data.exchange_rate || 1.0,
        subtotal,
        taxAmount,
        totalAmount,
        data.template_style || 'Standard',
        'DRAFT',
        data.terms || 'Payment within 30 days of quotation approval.',
        data.notes || null,
      ]
    );
    const quotation = qRes.rows[0];

    for (const item of items) {
      await client.query(
        `
          INSERT INTO public.quotation_items (quotation_id, product_id, description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          quotation.id,
          item.product_id || null,
          item.description,
          item.quantity || 1,
          item.unit_price || 0,
          Number(item.quantity || 1) * Number(item.unit_price || 0),
        ]
      );
    }

    // Update lead status if lead_id provided
    if (data.lead_id) {
      await client.query(`UPDATE public.crm_leads SET status = 'QUOTED' WHERE id = $1`, [data.lead_id]);
    }

    await client.query('COMMIT');
    return quotation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuotationStatus(id, status) {
  const result = await pool.query(
    `UPDATE public.quotations SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Quotation not found.');
  return result.rows[0];
}
