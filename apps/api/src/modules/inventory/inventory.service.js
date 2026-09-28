import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

const COMPANY_SETTINGS_KEY = 'inventory_company_settings';
const INVENTORY_SETTINGS_KEY = 'inventory_preferences';

const DEFAULT_COMPANY_SETTINGS = {
  company_name: 'Electronic Safety & Security Private Limited',
  ntn_number: '3628486-6',
  gst_number: '1700362848614',
  address: '',
  phone: '',
  bank_account_number: '24438000016603',
};

const DEFAULT_INVENTORY_SETTINGS = {
  default_min_stock_threshold: 5,
  low_stock_alert_email: '',
};

async function nextInventoryInvoiceNumber(client) {
  await client.query(`CREATE SEQUENCE IF NOT EXISTS public.inventory_invoice_number_seq`);
  const seqResult = await client.query(`SELECT nextval('public.inventory_invoice_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `INV-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

async function nextInventoryTokenNumber(client) {
  await client.query(`CREATE SEQUENCE IF NOT EXISTS public.inventory_token_number_seq`);
  const seqResult = await client.query(`SELECT nextval('public.inventory_token_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `TKN-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

async function nextPurchaseOrderNumber(client) {
  await client.query(`CREATE SEQUENCE IF NOT EXISTS public.purchase_order_number_seq`);
  const seqResult = await client.query(`SELECT nextval('public.purchase_order_number_seq')::int AS seq`);
  const seq = seqResult.rows[0].seq;
  return `PO-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

function estimateProductPrice(productName = '', productType = 'ASSET') {
  const name = String(productName || '').toLowerCase();
  if (name.includes('camera') && (name.includes('ptz') || name.includes('anpr'))) return [85000, 68000];
  if (name.includes('camera')) return [15000, 12000];
  if (name.includes('nvr') || name.includes('dvr')) return [45000, 36000];
  if (name.includes('access') && name.includes('panel')) return [30000, 24000];
  if (name.includes('smoke') || name.includes('detector')) return [8500, 6500];
  if (name.includes('barrier')) return [145000, 118000];
  if (name.includes('cable') || name.includes('cat6')) return [180, 120];
  if (name.includes('battery')) return [5500, 4200];
  if (name.includes('psu') || name.includes('power supply')) return [10000, 7800];
  if (name.includes('connector')) return [350, 220];
  if (name.includes('license') || name.includes('software')) return [25000, 18000];
  if (name.includes('maintenance') || name.includes('contract') || productType === 'SERVICE') return [30000, 0];
  if (productType === 'CONSUMABLE') return [750, 500];
  return [12000, 9000];
}

async function ensureProductPricesSeeded() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;

  const result = await pool.query(`
    SELECT id, product_name, product_type
    FROM public.products
    WHERE COALESCE(unit_price, 0) <= 0
  `);

  for (const product of result.rows) {
    const [unitPrice, costPrice] = estimateProductPrice(product.product_name, product.product_type);
    await pool.query(
      `
        UPDATE public.products
        SET unit_price = CASE WHEN COALESCE(unit_price, 0) <= 0 THEN $1 ELSE unit_price END,
            cost_price = CASE WHEN COALESCE(cost_price, 0) <= 0 THEN $2 ELSE cost_price END,
            updated_at = NOW()
        WHERE id = $3
      `,
      [unitPrice, costPrice, product.id],
    );
  }
}

async function ensurePurchaseOrderWorkflowColumns(db = pool) {
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ORDERED'`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(14,2) DEFAULT 0`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,2) DEFAULT 0`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) DEFAULT 0`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS crm_order_id UUID`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS quotation_id UUID`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.query(`ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS received_quantity INT NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS quotation_item_id UUID`);
}

async function resolveOrderStockStatus(client, quotationId) {
  const result = await client.query(
    `
      SELECT
        COUNT(qi.id)::int AS total_items,
        COUNT(qi.id) FILTER (
          WHERE qi.product_id IS NULL
             OR COALESCE(p.quantity, 0) < COALESCE(qi.quantity, 1)
        )::int AS shortage_items
      FROM public.quotation_items qi
      LEFT JOIN public.products p ON p.id = qi.product_id
      WHERE qi.quotation_id = $1
    `,
    [quotationId],
  );
  const stats = result.rows[0] || {};
  if (Number(stats.total_items || 0) === 0) {
    return 'TOKEN_GENERATED';
  }
  return Number(stats.shortage_items || 0) > 0 ? 'AWAITING_STOCK' : 'STOCK_OK';
}

export async function getInventorySummary(filters = {}) {
  const period = String(filters.period || filters.range || 'monthly').toLowerCase();
  const now = new Date();
  const end = new Date(now);
  let start;

  if (period === 'daily') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (period === 'weekly') {
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const [productStats, serialStats, workflowStats, csrStats] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_products,
        (
          COALESCE(SUM(CASE WHEN COALESCE(tracking_type, 'NONE') = 'NONE' THEN quantity ELSE 0 END), 0)
          + (SELECT COUNT(*) FROM public.inventory_items)
        )::numeric AS total_stock_qty,
        (
          COALESCE(SUM(CASE WHEN COALESCE(tracking_type, 'NONE') = 'NONE' THEN quantity ELSE 0 END), 0)
          + (SELECT COUNT(*) FROM public.inventory_items WHERE current_status = 'AVAILABLE')
        )::numeric AS available_stock_qty,
        COUNT(*) FILTER (WHERE quantity <= min_stock_level)::int AS low_stock_count,
        COALESCE(SUM(quantity * unit_price), 0)::numeric AS total_inventory_value
      FROM public.products
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total_serials,
        COUNT(*) FILTER (WHERE current_status = 'AVAILABLE')::int AS available_serials,
        COUNT(*) FILTER (WHERE current_status = 'ALLOCATED')::int AS allocated_serials,
        COUNT(*) FILTER (WHERE current_status = 'INSTALLED')::int AS installed_serials,
        COUNT(*) FILTER (WHERE current_status = 'DAMAGED')::int AS damaged_serials
      FROM public.inventory_items
    `),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.purchase_orders) AS total_pos,
        (SELECT COUNT(*)::int FROM public.invoices) AS total_invoices,
        (SELECT COUNT(*)::int FROM public.tracker_installations WHERE status != 'COMPLETED') AS pending_installations,
        (SELECT COUNT(*)::int FROM public.customer_complaints WHERE status IN ('TAKEN', 'PENDING')) AS active_complaints
    `),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int
         FROM public.crm_orders
         WHERE status IN ('PENDING_REVIEW', 'READY_FOR_INVENTORY', 'TOKEN_GENERATED', 'AWAITING_STOCK', 'STOCK_OK', 'PARTIALLY_DISPATCHED')) AS approved_csr_jobs,
        (SELECT COUNT(*)::int
         FROM public.crm_orders
         WHERE status IN ('PENDING_REVIEW', 'READY_FOR_INVENTORY')) AS pending_incoming_orders,
        (SELECT COUNT(*)::int
         FROM public.crm_orders
         WHERE token_number IS NOT NULL
           AND status IN ('TOKEN_GENERATED', 'AWAITING_STOCK', 'STOCK_OK', 'PARTIALLY_DISPATCHED', 'FULLY_DISPATCHED')) AS active_tokens,
        (SELECT COUNT(*)::int
         FROM public.installer_field_dispatches
         WHERE status IN ('PENDING', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS')) AS active_dispatches,
        (SELECT COUNT(*)::int
         FROM public.installer_field_dispatches
         WHERE status = 'RETURN_PENDING') AS pending_returns,
        (SELECT COUNT(*)::int
         FROM public.installer_field_dispatches
         WHERE status = 'RETURN_CONFIRMED') AS pending_bills,
        (SELECT COUNT(*)::int
         FROM public.quotations
         WHERE status = 'SENT') AS sent_csr_quotes
    `),
  ]);

  const hasMovementLedger = await ensureInventoryMovementLedgerColumns();
  const movementStats = hasMovementLedger
    ? await pool.query(
        `
          SELECT
            COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'STOCK_IN'), 0)::numeric AS period_stock_in_qty,
            COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'STOCK_OUT'), 0)::numeric AS period_stock_out_qty,
            COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'RETURN'), 0)::numeric AS period_return_qty,
            COUNT(*)::int AS period_movement_count
          FROM public.inventory_movements
          WHERE created_at >= $1
            AND created_at <= $2
        `,
        [start, end],
      )
    : {
        rows: [
          {
            period_stock_in_qty: 0,
            period_stock_out_qty: 0,
            period_return_qty: 0,
            period_movement_count: 0,
          },
        ],
      };

  return {
    ...productStats.rows[0],
    ...serialStats.rows[0],
    ...workflowStats.rows[0],
    ...csrStats.rows[0],
    ...movementStats.rows[0],
    summary_period: period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly',
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
}

export async function getInventoryWorkQueue(filters = {}) {
  const quoteColumns = await getPublicTableColumns('quotations');
  const quoteNumberExpr = quoteColumns.has('quotation_number')
    ? 'q.quotation_number'
    : quoteColumns.has('quotation_id')
      ? 'q.quotation_id'
      : 'q.id::text';
  const priceTierExpr = quoteColumns.has('price_tier') ? 'q.price_tier' : "'Standard'";
  const templateExpr = quoteColumns.has('template_style') ? 'q.template_style' : "'HBL Sales Tax Invoice'";
  const updatedExpr = quoteColumns.has('updated_at') ? 'q.updated_at' : 'q.created_at';
  const normalizedStockStatus = String(filters.stock_status || filters.stockStatus || '').toUpperCase();
  const readyQueueOnly = normalizedStockStatus === 'STOCK_OK';

  const result = await pool.query(
    `
      SELECT
        q.id,
        o.id AS order_id,
        o.order_number,
        o.token_number,
        o.status AS order_status,
        ${quoteNumberExpr} AS quotation_number,
        q.customer_id,
        c.customer_name,
        ${priceTierExpr} AS price_tier,
        ${templateExpr} AS template_style,
        q.status,
        q.status AS quotation_status,
        q.total_amount,
        q.created_at,
        COALESCE(o.updated_at, ${updatedExpr}) AS updated_at,
        COALESCE(item_stats.item_count, 0)::int AS item_count,
        CASE
          WHEN COALESCE(item_stats.item_count, 0)::int = 0 THEN 'TOKEN_GENERATED'
          WHEN COALESCE(item_stats.shortage_items, 0)::int > 0 THEN 'AWAITING_STOCK'
          ELSE 'STOCK_OK'
        END AS stock_status,
        COALESCE(item_stats.total_requested_qty, 0)::int AS total_requested_qty,
        COALESCE(item_stats.items, '[]'::jsonb) AS items
      FROM public.crm_orders o
      JOIN public.quotations q ON q.id = o.quotation_id
      LEFT JOIN public.customers c ON c.id = q.customer_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(qi.id)::int AS item_count,
          COALESCE(SUM(qi.quantity), 0)::int AS total_requested_qty,
          COUNT(qi.id) FILTER (
            WHERE qi.product_id IS NULL
               OR COALESCE(p.quantity, 0) < COALESCE(qi.quantity, 1)
          )::int AS shortage_items,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', qi.id,
                'product_id', qi.product_id,
                'product_name', COALESCE(p.product_name, qi.description, qi.item_description, 'Custom item'),
                'description', COALESCE(qi.description, qi.item_description, p.product_name),
                'required_qty', COALESCE(qi.quantity, 1),
                'unit_price', COALESCE(qi.unit_price, 0),
                'available_stock', COALESCE(p.quantity, 0),
                'serial_tracking', CASE WHEN p.tracking_type IN ('SERIAL', 'IMEI') THEN TRUE ELSE FALSE END,
                'stock_ok', CASE WHEN qi.product_id IS NULL THEN FALSE ELSE COALESCE(p.quantity, 0) >= COALESCE(qi.quantity, 1) END
              )
              ORDER BY qi.id
            ) FILTER (WHERE qi.id IS NOT NULL),
            '[]'::jsonb
          ) AS items
        FROM public.quotation_items qi
        LEFT JOIN public.products p ON p.id = qi.product_id
        WHERE qi.quotation_id = q.id
      ) item_stats ON TRUE
      WHERE q.status = 'APPROVED'
        AND o.status IN ('PENDING_REVIEW', 'READY_FOR_INVENTORY', 'TOKEN_GENERATED', 'AWAITING_STOCK', 'STOCK_OK', 'PARTIALLY_DISPATCHED')
        AND (
          $1::boolean = FALSE
          OR (
            o.token_number IS NOT NULL
            AND o.status = 'STOCK_OK'
            AND COALESCE(item_stats.item_count, 0)::int > 0
            AND COALESCE(item_stats.shortage_items, 0)::int = 0
          )
        )
      ORDER BY COALESCE(o.updated_at, ${updatedExpr}) DESC
      LIMIT 25
    `,
    [readyQueueOnly],
  );
  return result.rows;
}

export async function generateOrderToken(orderId, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SEQUENCE IF NOT EXISTS public.inventory_token_number_seq`);
    await client.query(`ALTER TABLE public.crm_orders ALTER COLUMN token_number DROP NOT NULL`);

    const orderRes = await client.query(
      `
        SELECT
          o.*,
          q.quotation_number,
          q.total_amount,
          c.customer_name,
          COALESCE(item_stats.item_count, 0)::int AS item_count
        FROM public.crm_orders o
        JOIN public.quotations q ON q.id = o.quotation_id
        LEFT JOIN public.customers c ON c.id = o.customer_id
        LEFT JOIN (
          SELECT quotation_id, COUNT(*) AS item_count
          FROM public.quotation_items
          GROUP BY quotation_id
        ) item_stats ON item_stats.quotation_id = q.id
        WHERE o.id = $1
        FOR UPDATE OF o
      `,
      [orderId],
    );

    const order = orderRes.rows[0];
    if (!order) {
      throw new AppError('NOT_FOUND', 'Incoming order not found.', 404);
    }

    if (order.token_number) {
      const stockStatus = await resolveOrderStockStatus(client, order.quotation_id);
      const updated = await client.query(
        `
          UPDATE public.crm_orders
          SET status = CASE
                WHEN status IN ('PENDING_REVIEW', 'READY_FOR_INVENTORY', 'TOKEN_GENERATED', 'STOCK_OK', 'AWAITING_STOCK') THEN $2
                ELSE status
              END,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [orderId, stockStatus],
      );
      await client.query('COMMIT');
      return {
        ...order,
        ...updated.rows[0],
        already_generated: true,
      };
    }

    const tokenNumber = await nextInventoryTokenNumber(client);
    const stockStatus = await resolveOrderStockStatus(client, order.quotation_id);
    const updated = await client.query(
      `
        UPDATE public.crm_orders
        SET token_number = $2,
            status = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [orderId, tokenNumber, stockStatus],
    );

    await client.query('COMMIT');
    return {
      ...order,
      ...updated.rows[0],
      already_generated: false,
      created_by: actorId || order.created_by || null,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err?.code === '23505') {
      const existing = await pool.query(
        `
          SELECT o.*, q.quotation_number, q.total_amount, c.customer_name
          FROM public.crm_orders o
          JOIN public.quotations q ON q.id = o.quotation_id
          LEFT JOIN public.customers c ON c.id = o.customer_id
          WHERE o.id = $1
        `,
        [orderId],
      );
      if (existing.rows[0]?.token_number) {
        return { ...existing.rows[0], already_generated: true };
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function getInventoryTokens() {
  const result = await pool.query(
    `
      SELECT
        o.id,
        o.order_number,
        o.token_number,
        o.status AS order_status,
        CASE
          WHEN o.status IN ('COMPLETED', 'BILL_SENT', 'INVOICED') THEN 'COMPLETED'
          WHEN COALESCE(dispatch_stats.total_dispatches, 0) > 0
            AND COALESCE(dispatch_stats.dispatched_qty, 0) >= COALESCE(required_stats.required_qty, 0)
            AND COALESCE(required_stats.required_qty, 0) > 0 THEN 'FULLY_DISPATCHED'
          WHEN COALESCE(dispatch_stats.total_dispatches, 0) > 0 THEN 'PARTIALLY_DISPATCHED'
          ELSE 'ACTIVE'
        END AS status,
        o.created_at,
        o.updated_at,
        q.quotation_number,
        q.total_amount,
        c.customer_name,
        COALESCE(item_stats.item_count, 0)::int AS item_count
      FROM public.crm_orders o
      JOIN public.quotations q ON q.id = o.quotation_id
      LEFT JOIN public.customers c ON c.id = o.customer_id
      LEFT JOIN (
        SELECT quotation_id, COUNT(*) AS item_count
        FROM public.quotation_items
        GROUP BY quotation_id
      ) item_stats ON item_stats.quotation_id = q.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(qi.quantity), 0)::numeric AS required_qty
        FROM public.quotation_items qi
        WHERE qi.quotation_id = o.quotation_id
      ) required_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT d.id)::int AS total_dispatches,
          COALESCE(SUM(di.quantity_issued), 0)::numeric AS dispatched_qty
        FROM public.installer_field_dispatches d
        LEFT JOIN public.installer_dispatch_items di ON di.dispatch_id = d.id
        WHERE d.quotation_id = o.quotation_id
          AND COALESCE(d.status, '') <> 'CANCELLED'
      ) dispatch_stats ON TRUE
      WHERE o.token_number IS NOT NULL
      ORDER BY o.updated_at DESC, o.created_at DESC
    `,
  );
  return result.rows;
}

export async function getInventoryInstallers(options = {}) {
  const includeInactive = options.includeInactive === true || String(options.includeInactive || '').toLowerCase() === 'true';
  const activeFilter = includeInactive ? '' : 'WHERE COALESCE(u.is_active, true) = true';
  const activeAnd = includeInactive ? 'WHERE' : 'AND';
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.email,
        u.employee_id,
        COALESCE(u.is_active, true) AS is_active,
        empc.primary_phone AS phone,
        COALESCE(ei.name, u.email) AS display_name,
        r.role_name,
        dsg.title AS designation_title
      FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      LEFT JOIN public.employee_contacts empc ON empc.employee_id = u.employee_id
      LEFT JOIN public.job_info ji ON ji.employee_id = u.employee_id
      LEFT JOIN public.designations dsg ON dsg.id = ji.designation_id
      ${activeFilter}
        ${activeAnd} (
          r.role_name ILIKE '%installer%'
          OR r.role_name ILIKE '%field%'
          OR dsg.title ILIKE '%installer%'
          OR dsg.title ILIKE '%technician%'
        )
      ORDER BY display_name ASC, u.email ASC
    `,
  );

  if (result.rows.length) {
    return result.rows;
  }

  const fallback = await pool.query(
    `
      SELECT
        u.id,
        u.email,
        u.employee_id,
        COALESCE(u.is_active, true) AS is_active,
        empc.primary_phone AS phone,
        COALESCE(ei.name, u.email) AS display_name,
        r.role_name,
        dsg.title AS designation_title
      FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      LEFT JOIN public.employee_contacts empc ON empc.employee_id = u.employee_id
      LEFT JOIN public.job_info ji ON ji.employee_id = u.employee_id
      LEFT JOIN public.designations dsg ON dsg.id = ji.designation_id
      ${includeInactive ? 'WHERE' : 'WHERE COALESCE(u.is_active, true) = true AND'} COALESCE(r.role_name, '') <> 'super_admin'
      ORDER BY display_name ASC, u.email ASC
      LIMIT 50
    `,
  );
  return fallback.rows;
}

function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

async function readSystemSetting(key, fallback) {
  const result = await pool.query(
    `
      SELECT setting_value
      FROM public.system_settings
      WHERE setting_key = $1
      LIMIT 1
    `,
    [key],
  );
  return safeJsonParse(result.rows[0]?.setting_value, fallback);
}

async function upsertSystemSetting(key, value, description, updatedByUserId = null) {
  const result = await pool.query(
    `
      INSERT INTO public.system_settings (setting_key, setting_value, description, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING setting_value
    `,
    [key, JSON.stringify(value), description, updatedByUserId],
  );
  return safeJsonParse(result.rows[0]?.setting_value, value);
}

export async function getMasterSettings() {
  const [company, inventory] = await Promise.all([
    readSystemSetting(COMPANY_SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS),
    readSystemSetting(INVENTORY_SETTINGS_KEY, DEFAULT_INVENTORY_SETTINGS),
  ]);
  return { company, inventory };
}

export async function updateCompanySettings(data, actorId = null) {
  const company = {
    ...DEFAULT_COMPANY_SETTINGS,
    company_name: String(data.company_name || '').trim(),
    ntn_number: String(data.ntn_number || '').trim(),
    gst_number: String(data.gst_number || '').trim(),
    address: String(data.address || '').trim(),
    phone: String(data.phone || '').trim(),
    bank_account_number: String(data.bank_account_number || '').trim(),
  };

  if (!company.company_name) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Company name is required.');
  }

  return upsertSystemSetting(
    COMPANY_SETTINGS_KEY,
    company,
    'Inventory company profile used on settings, receipts and invoice defaults.',
    actorId,
  );
}

export async function updateInventorySettings(data, actorId = null) {
  const threshold = Number(data.default_min_stock_threshold);
  const inventory = {
    ...DEFAULT_INVENTORY_SETTINGS,
    default_min_stock_threshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_INVENTORY_SETTINGS.default_min_stock_threshold,
    low_stock_alert_email: String(data.low_stock_alert_email || '').trim(),
  };

  if (inventory.low_stock_alert_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inventory.low_stock_alert_email)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Low stock alert email is invalid.');
  }

  return upsertSystemSetting(
    INVENTORY_SETTINGS_KEY,
    inventory,
    'Inventory preferences such as low stock thresholds and alert routing.',
    actorId,
  );
}

export async function getCategories() {
  const result = await pool.query(`
    SELECT ic.*, COUNT(p.id)::int AS product_count
    FROM public.item_categories ic
    LEFT JOIN public.products p ON p.category_id = ic.id
    GROUP BY ic.id
    ORDER BY ic.category_name ASC
  `);
  return result.rows;
}

export async function createCategory({ category_name, description }) {
  if (!category_name || !category_name.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Category name is required.', 400);
  }
  const result = await pool.query(
    `
    INSERT INTO public.item_categories (category_name, description)
    VALUES ($1, $2)
    RETURNING *
    `,
    [category_name.trim(), description?.trim() || null]
  );
  return result.rows[0];
}

export async function updateCategory(id, { category_name, description }) {
  if (!category_name || !category_name.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Category name is required.', 400);
  }
  const result = await pool.query(
    `
    UPDATE public.item_categories
    SET category_name = $1, description = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [category_name.trim(), description?.trim() || null, id]
  );
  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Category not found.', 404);
  }
  return result.rows[0];
}

export async function deleteCategory(id) {
  const result = await pool.query(`DELETE FROM public.item_categories WHERE id = $1 RETURNING id`, [id]);
  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Category not found.', 404);
  }
  return { deleted: true };
}

export async function getProducts(options = {}) {
  const { search, category_id, product_type, tracking_type, stock_status, limit = 50, offset = 0 } = options;
  await ensureProductPricesSeeded();

  let query = `
    SELECT
      p.*,
      COALESCE(p.unit_price, 0)::numeric AS unit_price,
      COALESCE(p.cost_price, 0)::numeric AS cost_price,
      ic.category_name,
      COUNT(ii.id)::int AS serial_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'AVAILABLE')::int AS available_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'ALLOCATED')::int AS allocated_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'INSTALLED')::int AS installed_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'DAMAGED')::int AS damaged_count,
      COALESCE(price_tiers.price_tiers, '{}'::jsonb) AS price_tiers
    FROM public.products p
    LEFT JOIN public.item_categories ic ON ic.id = p.category_id
    LEFT JOIN public.inventory_items ii ON ii.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(tier_name, price) AS price_tiers
      FROM public.product_price_tiers
      WHERE product_id = p.id
    ) price_tiers ON TRUE
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search.trim()}%`);
    query += ` AND (p.product_name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }

  if (category_id) {
    params.push(category_id);
    query += ` AND p.category_id = $${params.length}`;
  }

  if (product_type) {
    params.push(product_type.toUpperCase());
    query += ` AND p.product_type = $${params.length}`;
  }

  if (tracking_type) {
    params.push(tracking_type.toUpperCase());
    query += ` AND p.tracking_type = $${params.length}`;
  }

  if (stock_status === 'low_stock') {
    query += ` AND p.quantity <= p.min_stock_level`;
  } else if (stock_status === 'out_of_stock') {
    query += ` AND p.quantity = 0`;
  } else if (stock_status === 'in_stock') {
    query += ` AND p.quantity > 0`;
  }

  query += `
    GROUP BY p.id, ic.category_name, price_tiers.price_tiers
    ORDER BY p.product_name ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createProduct(data) {
  const { product_name, category_id, product_type = 'ASSET', tracking_type = 'NONE', quantity = 0, min_stock_level = 5, unit_price = 0, cost_price = 0, description } = data;

  if (!product_name || !product_name.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Product name is required.', 400);
  }

  const result = await pool.query(
    `
    INSERT INTO public.products (product_name, category_id, product_type, tracking_type, quantity, min_stock_level, unit_price, cost_price, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      product_name.trim(),
      category_id || null,
      ['ASSET', 'CONSUMABLE', 'SERVICE'].includes(product_type.toUpperCase()) ? product_type.toUpperCase() : 'ASSET',
      ['SERIAL', 'IMEI', 'NONE'].includes(tracking_type.toUpperCase()) ? tracking_type.toUpperCase() : 'NONE',
      Math.max(0, parseInt(quantity, 10) || 0),
      Math.max(0, parseInt(min_stock_level, 10) || 5),
      Math.max(0, parseFloat(unit_price) || 0),
      Math.max(0, parseFloat(cost_price) || 0),
      description?.trim() || null,
    ]
  );
  return result.rows[0];
}

export async function updateProduct(id, data) {
  const { product_name, category_id, product_type, tracking_type, quantity, min_stock_level, unit_price, cost_price, description } = data;

  if (!product_name || !product_name.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Product name is required.', 400);
  }

  const result = await pool.query(
    `
    UPDATE public.products
    SET product_name = $1,
        category_id = $2,
        product_type = $3,
        tracking_type = $4,
        quantity = $5,
        min_stock_level = $6,
        unit_price = $7,
        cost_price = $8,
        description = $9,
        updated_at = NOW()
    WHERE id = $10
    RETURNING *
    `,
    [
      product_name.trim(),
      category_id || null,
      ['ASSET', 'CONSUMABLE', 'SERVICE'].includes(product_type?.toUpperCase()) ? product_type.toUpperCase() : 'ASSET',
      ['SERIAL', 'IMEI', 'NONE'].includes(tracking_type?.toUpperCase()) ? tracking_type.toUpperCase() : 'NONE',
      Math.max(0, parseInt(quantity, 10) || 0),
      Math.max(0, parseInt(min_stock_level, 10) || 5),
      Math.max(0, parseFloat(unit_price) || 0),
      Math.max(0, parseFloat(cost_price) || 0),
      description?.trim() || null,
      id,
    ]
  );

  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Product not found.', 404);
  }
  return result.rows[0];
}

export async function deleteProduct(id) {
  const result = await pool.query(`DELETE FROM public.products WHERE id = $1 RETURNING id`, [id]);
  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Product not found.', 404);
  }
  return { deleted: true };
}

export async function getInventoryItems(options = {}) {
  const { search, product_id, current_status, limit = 50, offset = 0 } = options;

  let query = `
    SELECT ii.*, p.product_name, p.tracking_type, ic.category_name
    FROM public.inventory_items ii
    JOIN public.products p ON p.id = ii.product_id
    LEFT JOIN public.item_categories ic ON ic.id = p.category_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search.trim()}%`);
    query += ` AND (ii.serial_number ILIKE $${params.length} OR ii.imei ILIKE $${params.length} OR ii.location ILIKE $${params.length})`;
  }

  if (product_id) {
    params.push(product_id);
    query += ` AND ii.product_id = $${params.length}`;
  }

  if (current_status) {
    params.push(current_status.toUpperCase());
    query += ` AND ii.current_status = $${params.length}`;
  }

  query += ` ORDER BY ii.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createInventoryItem(data, actorId = null) {
  const { product_id, serial_number, imei, current_status = 'AVAILABLE', location, notes } = data;

  if (!product_id) {
    throw new AppError('VALIDATION_ERROR', 'Product ID is required.', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const normalizedStatus = ['AVAILABLE', 'ALLOCATED', 'INSTALLED', 'RETURNED', 'DAMAGED'].includes(current_status.toUpperCase())
      ? current_status.toUpperCase()
      : 'AVAILABLE';
    const result = await client.query(
      `
      INSERT INTO public.inventory_items (product_id, serial_number, imei, current_status, location, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        product_id,
        serial_number?.trim() || null,
        imei?.trim() || null,
        normalizedStatus,
        location?.trim() || null,
        notes?.trim() || null,
      ]
    );
    const item = result.rows[0];
    await recordInventoryMovement(client, {
      product_id,
      inventory_item_id: item.id,
      movement_type: normalizedStatus === 'AVAILABLE' ? 'STOCK_IN' : movementTypeFromStatus(normalizedStatus),
      quantity: 1,
      reference_type: 'SERIAL_CREATE',
      reference_id: item.id,
      notes: notes?.trim() || 'Serial / IMEI item created',
      created_by: actorId,
    });
    await client.query('COMMIT');
    return item;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInventoryItem(id, data, actorId = null) {
  const { current_status, location, notes, serial_number, imei } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeRes = await client.query(`SELECT * FROM public.inventory_items WHERE id = $1 FOR UPDATE`, [id]);
    if (beforeRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Inventory item not found.', 404);
    }
    const before = beforeRes.rows[0];
    const nextStatus = current_status ? current_status.toUpperCase() : null;
    const result = await client.query(
      `
      UPDATE public.inventory_items
      SET current_status = COALESCE($1, current_status),
          location = COALESCE($2, location),
          notes = COALESCE($3, notes),
          serial_number = COALESCE($4, serial_number),
          imei = COALESCE($5, imei),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        nextStatus,
        location ? location.trim() : null,
        notes ? notes.trim() : null,
        serial_number ? serial_number.trim() : null,
        imei ? imei.trim() : null,
        id,
      ]
    );
    const updated = result.rows[0];
    if (nextStatus && before.current_status !== updated.current_status) {
      await recordInventoryMovement(client, {
        product_id: updated.product_id,
        inventory_item_id: updated.id,
        movement_type: movementTypeFromStatus(updated.current_status),
        quantity: 1,
        reference_type: 'SERIAL_STATUS',
        reference_id: updated.id,
        notes: `Status changed ${before.current_status} -> ${updated.current_status}`,
        created_by: actorId,
      });
    }
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function confirmReturnedInventoryItem(id, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeRes = await client.query(`SELECT * FROM public.inventory_items WHERE id = $1 FOR UPDATE`, [id]);
    if (beforeRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Inventory item not found.', 404);
    }
    const before = beforeRes.rows[0];
    if (before.current_status !== 'RETURNED') {
      throw new AppError('VALIDATION_ERROR', 'Only returned serial items can be confirmed back to available stock.', 400);
    }

    const result = await client.query(
      `
        UPDATE public.inventory_items
        SET current_status = 'AVAILABLE',
            notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END || 'Return confirmed in good condition.',
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );
    const updated = result.rows[0];

    await recordInventoryMovement(client, {
      product_id: updated.product_id,
      inventory_item_id: updated.id,
      movement_type: 'RETURN',
      quantity: 1,
      reference_type: 'RETURN_CONFIRMATION',
      reference_id: updated.id,
      notes: 'Return confirmed in good condition; serial available again',
      created_by: actorId,
    });

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteInventoryItem(id, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeRes = await client.query(`SELECT * FROM public.inventory_items WHERE id = $1 FOR UPDATE`, [id]);
    if (beforeRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Inventory item not found.', 404);
    }
    const item = beforeRes.rows[0];
    await recordInventoryMovement(client, {
      product_id: item.product_id,
      inventory_item_id: item.id,
      movement_type: 'STOCK_OUT',
      quantity: 1,
      reference_type: 'SERIAL_DELETE',
      reference_id: item.id,
      notes: 'Serial / IMEI item removed from inventory',
      created_by: actorId,
    });
    await client.query(`DELETE FROM public.inventory_items WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return { deleted: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Vendors & Customers
export async function getVendors() {
  const columns = await getPublicTableColumns('vendors');
  const nameExpr = columns.has('vendor_name') ? 'vendor_name' : columns.has('name') ? 'name' : 'id::text';
  const result = await pool.query(`
    SELECT *, ${nameExpr} AS name
    FROM public.vendors
    ORDER BY ${nameExpr} ASC
  `);
  return result.rows;
}

export async function createVendor({ name, contact_person, email, phone, address }) {
  if (!name || !name.trim()) throw new AppError('VALIDATION_ERROR', 'Vendor name is required.', 400);
  const columns = await getPublicTableColumns('vendors');
  const insertColumns = [];
  const values = [];

  if (columns.has('vendor_name')) {
    insertColumns.push('vendor_name');
    values.push(name.trim());
  } else if (columns.has('name')) {
    insertColumns.push('name');
    values.push(name.trim());
  }
  if (columns.has('contact_person')) {
    insertColumns.push('contact_person');
    values.push(contact_person?.trim() || null);
  }
  if (columns.has('email')) {
    insertColumns.push('email');
    values.push(email?.trim() || null);
  }
  if (columns.has('phone')) {
    insertColumns.push('phone');
    values.push(phone?.trim() || null);
  }
  if (columns.has('address')) {
    insertColumns.push('address');
    values.push(address?.trim() || null);
  }

  const result = await pool.query(
    `INSERT INTO public.vendors (${insertColumns.join(', ')}) VALUES (${insertColumns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function updateVendor(id, { name, contact_person, email, phone, address }) {
  if (!name || !name.trim()) throw new AppError('VALIDATION_ERROR', 'Supplier name is required.', 400);
  const columns = await getPublicTableColumns('vendors');
  const updates = [];
  const values = [];

  const nameColumn = columns.has('vendor_name') ? 'vendor_name' : columns.has('name') ? 'name' : null;
  if (nameColumn) {
    values.push(name.trim());
    updates.push(`${nameColumn} = $${values.length}`);
  }
  if (columns.has('contact_person')) {
    values.push(contact_person?.trim() || null);
    updates.push(`contact_person = $${values.length}`);
  }
  if (columns.has('email')) {
    values.push(email?.trim() || null);
    updates.push(`email = $${values.length}`);
  }
  if (columns.has('phone')) {
    values.push(phone?.trim() || null);
    updates.push(`phone = $${values.length}`);
  }
  if (columns.has('address')) {
    values.push(address?.trim() || null);
    updates.push(`address = $${values.length}`);
  }
  if (columns.has('updated_at')) {
    updates.push('updated_at = NOW()');
  }

  if (!updates.length) {
    throw new AppError(500, 'SCHEMA_ERROR', 'Vendors table has no editable columns.');
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE public.vendors SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Supplier not found.');
  }

  return { ...result.rows[0], name: result.rows[0].vendor_name || result.rows[0].name };
}

export async function deleteVendor(id) {
  const result = await pool.query(`DELETE FROM public.vendors WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Supplier not found.');
  }
  return { deleted: true };
}

export async function updateInstallerStatus(id, { is_active }) {
  const userColumns = await getPublicTableColumns('users');
  if (!userColumns.has('is_active')) {
    throw new AppError(500, 'SCHEMA_ERROR', 'Users table does not support active/inactive status.');
  }
  const result = await pool.query(
    `
      UPDATE public.users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, employee_id, is_active
    `,
    [Boolean(is_active), id],
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Installer not found.');
  }
  return result.rows[0];
}

async function publicTableExists(tableName) {
  const result = await pool.query(`SELECT to_regclass($1) AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
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

async function ensureInventoryMovementLedgerColumns(db = pool) {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return true;

  const tableResult = await db.query(`SELECT to_regclass('public.inventory_movements') AS table_name`);
  if (!tableResult.rows[0]?.table_name) return false;

  await db.query(`ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS product_id UUID`);
  await db.query(`ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 1`);
  await db.query(`ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.query(`ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_by UUID`);
  await db.query(`UPDATE public.inventory_movements SET quantity = 1 WHERE quantity IS NULL`);

  return true;
}

async function insertInvoiceItemRow(client, itemColumns, invoiceId, item) {
  if (itemColumns.has('product_id') && !item.product_id) {
    return;
  }

  const q = Math.max(1, parseInt(item.quantity, 10) || 1);
  const p = Math.max(0, parseFloat(item.unit_price) || 0);
  const columns = ['invoice_id'];
  const values = [invoiceId];

  if (itemColumns.has('product_id')) {
    columns.push('product_id');
    values.push(item.product_id);
  }
  if (itemColumns.has('quantity')) {
    columns.push('quantity');
    values.push(q);
  }
  if (itemColumns.has('unit_price')) {
    columns.push('unit_price');
    values.push(p);
  }
  if (itemColumns.has('total_price')) {
    columns.push('total_price');
    values.push(q * p);
  }
  if (itemColumns.has('remarks')) {
    columns.push('remarks');
    values.push(item.remarks || item.item_description || null);
  }

  await client.query(
    `INSERT INTO public.invoice_items (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})`,
    values,
  );
}

function toInt(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMovementType(value, fallback = 'TRANSFER') {
  const type = String(value || fallback).toUpperCase();
  return ['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'RETURN'].includes(type) ? type : fallback;
}

function movementTypeFromStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'AVAILABLE' || normalized === 'RETURNED') return 'RETURN';
  if (['ALLOCATED', 'INSTALLED', 'DAMAGED'].includes(normalized)) return 'STOCK_OUT';
  return 'TRANSFER';
}

export async function recordInventoryMovement(db, data = {}) {
  try {
    if (!(await publicTableExists('inventory_movements'))) return null;
    await ensureInventoryMovementLedgerColumns(db);

    const columns = await getPublicTableColumns('inventory_movements');
    let productId = data.product_id || null;
    if (!productId && data.inventory_item_id && columns.has('product_id')) {
      const itemResult = await db.query(
        `SELECT product_id FROM public.inventory_items WHERE id = $1`,
        [data.inventory_item_id],
      );
      productId = itemResult.rows[0]?.product_id || null;
    }

    const valuesByColumn = {
      product_id: productId,
      inventory_item_id: data.inventory_item_id || null,
      movement_type: normalizeMovementType(data.movement_type),
      quantity: Math.max(1, toInt(data.quantity, 1)),
      reference_type: data.reference_type || 'MANUAL',
      reference_id: data.reference_id || null,
      notes: data.notes || null,
      remarks: data.notes || null,
      created_by: data.created_by || null,
      moved_by: data.created_by || null,
    };

    const insertColumns = Object.keys(valuesByColumn).filter((column) => columns.has(column));
    if (!insertColumns.includes('movement_type')) return null;
    if (columns.has('product_id') && !valuesByColumn.product_id) return null;

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const values = insertColumns.map((column) => valuesByColumn[column]);
    const result = await db.query(
      `INSERT INTO public.inventory_movements (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn('Inventory movement ledger write skipped:', error.message);
    return null;
  }
}

export async function getInventoryMovements(options = {}) {
  if (!(await publicTableExists('inventory_movements'))) return [];

  const columns = await getPublicTableColumns('inventory_movements');
  const hasProductId = columns.has('product_id');
  const hasInventoryItemId = columns.has('inventory_item_id');
  const hasQuantity = columns.has('quantity');
  const hasNotes = columns.has('notes');
  const hasCreatedBy = columns.has('created_by');
  const hasMovedBy = columns.has('moved_by');
  const hasReferenceType = columns.has('reference_type');
  const hasReferenceId = columns.has('reference_id');

  const createdByColumn = hasCreatedBy ? 'im.created_by' : hasMovedBy ? 'im.moved_by' : 'NULL';
  const inventoryItemIdExpr = hasInventoryItemId ? 'im.inventory_item_id' : 'NULL';
  const productIdExpr = hasProductId ? 'COALESCE(im.product_id, ii.product_id)' : 'ii.product_id';
  const notesExpr = hasNotes ? 'im.notes' : columns.has('remarks') ? 'im.remarks' : 'NULL';
  const quantityExpr = hasQuantity ? 'COALESCE(im.quantity, 1)' : '1';
  const referenceTypeExpr = hasReferenceType ? 'im.reference_type' : "'Manual'";
  const referenceIdExpr = hasReferenceId ? 'im.reference_id' : 'NULL';
  const limit = Math.min(Math.max(toInt(options.limit, 100), 1), 500);
  const offset = Math.max(toInt(options.offset, 0), 0);
  const params = [];

  let query = `
    SELECT
      im.id,
      ${productIdExpr} AS product_id,
      COALESCE(p.product_name, 'Unlinked stock movement') AS product_name,
      ${inventoryItemIdExpr} AS inventory_item_id,
      ii.serial_number,
      ii.imei,
      im.movement_type,
      ${quantityExpr}::int AS quantity,
      ${referenceTypeExpr} AS reference_type,
      ${referenceIdExpr} AS reference_id,
      ${notesExpr} AS notes,
      ${createdByColumn} AS created_by,
      u.email AS created_by_email,
      im.created_at
    FROM public.inventory_movements im
    LEFT JOIN public.inventory_items ii ON ${hasInventoryItemId ? 'ii.id = im.inventory_item_id' : 'FALSE'}
    LEFT JOIN public.products p ON p.id = ${productIdExpr}
    LEFT JOIN public.users u ON u.id::text = (${createdByColumn})::text
    WHERE 1=1
  `;

  if (options.search) {
    params.push(`%${String(options.search).trim()}%`);
    const searchParts = [
      `p.product_name ILIKE $${params.length}`,
      `ii.serial_number ILIKE $${params.length}`,
      `ii.imei ILIKE $${params.length}`,
    ];
    if (hasReferenceType) searchParts.push(`im.reference_type ILIKE $${params.length}`);
    if (notesExpr !== 'NULL') searchParts.push(`${notesExpr} ILIKE $${params.length}`);
    query += ` AND (${searchParts.join(' OR ')})`;
  }

  if (options.movement_type) {
    params.push(normalizeMovementType(options.movement_type));
    query += ` AND im.movement_type = $${params.length}`;
  }

  if (options.product_id) {
    params.push(options.product_id);
    query += ` AND ${productIdExpr} = $${params.length}`;
  }

  params.push(limit, offset);
  query += ` ORDER BY im.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getCustomers() {
  const hasCustomerVehicles = await publicTableExists('customer_vehicles');
  const result = await pool.query(
    hasCustomerVehicles
      ? `
        SELECT c.*, COUNT(v.id)::int AS vehicle_count
        FROM public.customers c
        LEFT JOIN public.customer_vehicles v ON v.customer_id = c.id
        GROUP BY c.id
        ORDER BY c.customer_name ASC
      `
      : `
        SELECT c.*, 0::int AS vehicle_count
        FROM public.customers c
        ORDER BY c.customer_name ASC
      `,
  );
  return result.rows;
}

export async function createCustomer({ customer_name, company_name, customer_type, contact_person, email, phone, address }) {
  if (!customer_name || !customer_name.trim()) throw new AppError('VALIDATION_ERROR', 'Customer name is required.', 400);
  const columns = await getPublicTableColumns('customers');
  const allowedValues = {
    customer_name: customer_name.trim(),
    company_name: company_name?.trim() || customer_name.trim(),
    customer_type: customer_type?.trim() || 'Corporate',
    contact_person: contact_person?.trim() || null,
    email: email?.trim() || '',
    phone: phone?.trim() || '',
    address: address?.trim() || null,
  };
  const insertColumns = Object.keys(allowedValues).filter((column) => columns.has(column));
  const values = insertColumns.map((column) => allowedValues[column]);
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `INSERT INTO public.customers (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return result.rows[0];
}

export async function updateCustomer(id, { customer_name, company_name, customer_type, contact_person, email, phone, address }) {
  if (!id) throw new AppError('VALIDATION_ERROR', 'Customer id is required.', 400);
  if (!customer_name || !customer_name.trim()) throw new AppError('VALIDATION_ERROR', 'Customer name is required.', 400);

  const columns = await getPublicTableColumns('customers');
  const allowedValues = {
    customer_name: customer_name.trim(),
    company_name: company_name?.trim() || customer_name.trim(),
    customer_type: customer_type?.trim() || 'Corporate',
    contact_person: contact_person?.trim() || null,
    email: email?.trim() || '',
    phone: phone?.trim() || '',
    address: address?.trim() || null,
  };
  const updateColumns = Object.keys(allowedValues).filter((column) => columns.has(column));
  if (!updateColumns.length) throw new AppError('VALIDATION_ERROR', 'No editable customer fields are available.', 400);

  const sets = updateColumns.map((column, index) => `${column} = $${index + 1}`);
  const values = updateColumns.map((column) => allowedValues[column]);
  if (columns.has('updated_at')) {
    sets.push('updated_at = NOW()');
  }
  values.push(id);

  const result = await pool.query(
    `UPDATE public.customers SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );
  if (!result.rows.length) throw new AppError('NOT_FOUND', 'Customer not found.', 404);
  return result.rows[0];
}

export async function deleteCustomer(id) {
  if (!id) throw new AppError('VALIDATION_ERROR', 'Customer id is required.', 400);

  const checks = [
    ['quotations', 'customer_id', 'quotations'],
    ['sales_quotations', 'customer_id', 'sales quotations'],
    ['invoices', 'customer_id', 'invoices'],
    ['customer_invoices', 'customer_id', 'customer invoices'],
    ['customer_vehicles', 'customer_id', 'vehicles'],
    ['tracker_installations', 'customer_id', 'installations'],
    ['customer_complaints', 'customer_id', 'complaints'],
    ['installer_field_dispatches', 'customer_id', 'field dispatches'],
  ];

  const linked = [];
  for (const [tableName, columnName, label] of checks) {
    if (!(await publicTableExists(tableName))) continue;
    const columns = await getPublicTableColumns(tableName);
    if (!columns.has(columnName)) continue;
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.${tableName} WHERE ${columnName} = $1`,
      [id],
    );
    if (Number(result.rows[0]?.count || 0) > 0) linked.push(label);
  }

  if (linked.length) {
    throw new AppError(
      'CUSTOMER_HAS_LINKED_RECORDS',
      `This client has linked ${linked.join(', ')}. Archive or update those records before deleting the client.`,
      409,
    );
  }

  const result = await pool.query('DELETE FROM public.customers WHERE id = $1 RETURNING id', [id]);
  if (!result.rows.length) throw new AppError('NOT_FOUND', 'Customer not found.', 404);
  return { deleted: true };
}

// Customer Vehicles
export async function getCustomerVehicles(customerId) {
  const result = await pool.query(
    `SELECT v.*, c.customer_name FROM public.customer_vehicles v JOIN public.customers c ON c.id = v.customer_id WHERE ($1::uuid IS NULL OR v.customer_id = $1) ORDER BY v.created_at DESC`,
    [customerId || null]
  );
  return result.rows;
}

export async function createCustomerVehicle({ customer_id, vehicle_number, make, model, vin }) {
  if (!customer_id || !vehicle_number?.trim()) throw new AppError('VALIDATION_ERROR', 'Customer and Vehicle Number are required.', 400);
  const result = await pool.query(
    `INSERT INTO public.customer_vehicles (customer_id, vehicle_number, make, model, vin) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [customer_id, vehicle_number.trim(), make?.trim() || null, model?.trim() || null, vin?.trim() || null]
  );
  return result.rows[0];
}

// Purchase Orders (PO)
export async function getPurchaseOrders() {
  await ensurePurchaseOrderWorkflowColumns();
  const poColumns = await getPublicTableColumns('purchase_orders');
  const poiColumns = await getPublicTableColumns('purchase_order_items');
  const vendorColumns = await getPublicTableColumns('vendors');
  const quoteColumns = await getPublicTableColumns('quotations');

  const poNumberExpr = poColumns.has('po_number')
    ? 'po.po_number'
    : poColumns.has('po_id')
      ? 'po.po_id'
      : 'po.id::text';
  const quoteNumberExpr = quoteColumns.has('quotation_number')
    ? 'q.quotation_number'
    : quoteColumns.has('quotation_id')
      ? 'q.quotation_id'
      : 'q.id::text';
  const statusExpr = poColumns.has('status') ? 'po.status' : `'ORDERED'`;
  const itemJoinColumn = poiColumns.has('purchase_order_id') ? 'purchase_order_id' : 'po_id';
  const itemProductNameExpr = poiColumns.has('product_name') ? 'poi.product_name' : 'NULL';
  const itemRemarksExpr = poiColumns.has('remarks') ? 'poi.remarks' : 'NULL';
  const itemReceivedExpr = poiColumns.has('received_quantity') ? 'COALESCE(poi.received_quantity, 0)' : '0';
  const itemQuotationItemExpr = poiColumns.has('quotation_item_id') ? 'poi.quotation_item_id' : 'NULL';
  const itemTotalExpr = poiColumns.has('total_price')
    ? 'COALESCE(poi.total_price, COALESCE(poi.quantity, 1) * COALESCE(poi.unit_price, 0))'
    : 'COALESCE(poi.quantity, 1) * COALESCE(poi.unit_price, 0)';
  const vendorNameExpr = vendorColumns.has('vendor_name')
    ? 'v.vendor_name'
    : vendorColumns.has('name')
      ? 'v.name'
      : 'v.id::text';

  const result = await pool.query(`
    SELECT
      po.*,
      ${poNumberExpr} AS po_number,
      ${statusExpr} AS status,
      ${vendorNameExpr} AS vendor_name,
      o.order_number,
      ${quoteNumberExpr} AS quotation_number,
      c.customer_name,
      COALESCE(po.order_date, po.created_at::date) AS order_date,
      po.expected_delivery_date,
      COUNT(poi.id)::int AS item_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', poi.id,
            'product_id', poi.product_id,
            'quotation_item_id', ${itemQuotationItemExpr},
            'product_name', COALESCE(p.product_name, ${itemProductNameExpr}, ${itemRemarksExpr}, 'Stock item'),
            'quantity', COALESCE(poi.quantity, 1),
            'received_quantity', ${itemReceivedExpr},
            'unit_price', COALESCE(poi.unit_price, 0),
            'total_price', ${itemTotalExpr},
            'remarks', ${itemRemarksExpr}
          )
          ORDER BY poi.id
        ) FILTER (WHERE poi.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM public.purchase_orders po
    LEFT JOIN public.vendors v ON v.id = po.vendor_id
    LEFT JOIN public.crm_orders o ON o.id = po.crm_order_id
    LEFT JOIN public.quotations q ON q.id = COALESCE(po.quotation_id, o.quotation_id)
    LEFT JOIN public.customers c ON c.id = q.customer_id
    LEFT JOIN public.purchase_order_items poi ON poi.${itemJoinColumn} = po.id
    LEFT JOIN public.products p ON p.id = poi.product_id
    GROUP BY po.id, v.id, o.id, q.id, c.id
    ORDER BY po.created_at DESC
  `);
  return result.rows;
}

export async function createPurchaseOrder({
  vendor_id,
  items = [],
  notes,
  order_date,
  expected_delivery_date,
  tax_rate = 18,
  order_id,
  crm_order_id,
  quotation_id,
}, actorId = null) {
  if (!vendor_id) {
    throw new AppError('VALIDATION_ERROR', 'Supplier is required before creating a purchase order.', 400);
  }
  if (!expected_delivery_date) {
    throw new AppError('VALIDATION_ERROR', 'Expected delivery date is required before creating a purchase order.', 400);
  }
  const normalizedOrderDate = String(order_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const normalizedExpectedDate = String(expected_delivery_date).slice(0, 10);
  const orderDateValue = new Date(`${normalizedOrderDate}T00:00:00.000Z`);
  const expectedDateValue = new Date(`${normalizedExpectedDate}T00:00:00.000Z`);
  if (
    Number.isNaN(orderDateValue.getTime())
    || Number.isNaN(expectedDateValue.getTime())
    || expectedDateValue < orderDateValue
  ) {
    throw new AppError('VALIDATION_ERROR', 'Expected delivery date must be on or after the PO date.', 400);
  }
  const draftItems = Array.isArray(items)
    ? items.filter((item) => item && (item.product_id || item.product_name || item.item_description || item.description || item.remarks || item.manual_description))
    : [];
  if (draftItems.length === 0 || draftItems.some((item) => (parseInt(item.quantity, 10) || 0) <= 0)) {
    throw new AppError('VALIDATION_ERROR', 'At least one product or custom purchase item with a valid quantity is required.', 400);
  }

  await ensurePurchaseOrderWorkflowColumns();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poNumber = await nextPurchaseOrderNumber(client);
    const poColumns = await getPublicTableColumns('purchase_orders');
    const itemColumns = await getPublicTableColumns('purchase_order_items');
    const quoteItemColumns = await getPublicTableColumns('quotation_items');
    const vendorResult = await client.query(`SELECT id FROM public.vendors WHERE id = $1`, [vendor_id]);
    if (!vendorResult.rows[0]) {
      throw new AppError('VALIDATION_ERROR', 'Selected supplier was not found.', 400);
    }

    const linkedOrderId = crm_order_id || order_id || null;
    let linkedQuotationId = quotation_id || null;
    let linkedOrderNumber = null;

    if (linkedOrderId) {
      const orderResult = await client.query(
        `SELECT id, order_number, quotation_id FROM public.crm_orders WHERE id = $1`,
        [linkedOrderId],
      );
      if (!orderResult.rows[0]) {
        throw new AppError('VALIDATION_ERROR', 'Linked CRM order was not found.', 400);
      }
      linkedOrderNumber = orderResult.rows[0].order_number;
      linkedQuotationId = linkedQuotationId || orderResult.rows[0].quotation_id;
    }

    const duplicateConditions = [];
    const duplicateValues = [];
    if (linkedOrderId && poColumns.has('crm_order_id')) {
      duplicateValues.push(linkedOrderId);
      duplicateConditions.push(`crm_order_id = $${duplicateValues.length}`);
    }
    if (linkedQuotationId && poColumns.has('quotation_id')) {
      duplicateValues.push(linkedQuotationId);
      duplicateConditions.push(`quotation_id = $${duplicateValues.length}`);
    }
    if (duplicateConditions.length && poColumns.has('status')) {
      const duplicatePoNumberExpr = poColumns.has('po_number')
        ? 'po_number'
        : poColumns.has('po_id')
          ? 'po_id'
          : 'id::text';
      const duplicatePo = await client.query(
        `
          SELECT id, ${duplicatePoNumberExpr} AS po_number
          FROM public.purchase_orders
          WHERE (${duplicateConditions.join(' OR ')})
            AND status IN ('ORDERED', 'PARTIALLY_RECEIVED')
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        duplicateValues,
      );
      if (duplicatePo.rows[0]) {
        throw new AppError(
          'DUPLICATE_PURCHASE_ORDER',
          `${duplicatePo.rows[0].po_number} is already open for this CRM order. Receive or complete that PO instead of creating another one.`,
          409,
        );
      }
    }

    let subtotal = 0;
    const normalizedItems = [];
    for (const item of draftItems) {
      let product = null;
      const requestedName = String(item.product_name || item.item_description || item.description || item.remarks || item.manual_description || '').trim();

      if (item.product_id) {
        const productResult = await client.query(`SELECT id, product_name, unit_price, cost_price FROM public.products WHERE id = $1`, [item.product_id]);
        product = productResult.rows[0];
      } else if (requestedName) {
        const existingProduct = await client.query(
          `SELECT id, product_name, unit_price, cost_price FROM public.products WHERE LOWER(product_name) = LOWER($1) LIMIT 1`,
          [requestedName],
        );
        product = existingProduct.rows[0];
      }

      if (!product) {
        if (!requestedName) {
          throw new AppError('VALIDATION_ERROR', 'Purchase item name is required.', 400);
        }
        const estimatedPrice = Math.max(0, parseFloat(item.unit_price) || Number(item.unitPrice || item.price || 0) || 0);
        const createdProduct = await client.query(
          `
            INSERT INTO public.products
              (product_name, category_id, product_type, tracking_type, quantity, min_stock_level, unit_price, cost_price, description)
            VALUES ($1, NULL, $2, $3, 0, 5, $4, $5, $6)
            RETURNING id, product_name, unit_price, cost_price
          `,
          [
            requestedName,
            String(item.product_type || 'ASSET').toUpperCase() === 'CONSUMABLE' ? 'CONSUMABLE' : 'ASSET',
            String(item.tracking_type || 'NONE').toUpperCase() === 'SERIAL' ? 'SERIAL' : String(item.tracking_type || 'NONE').toUpperCase() === 'IMEI' ? 'IMEI' : 'NONE',
            estimatedPrice,
            estimatedPrice,
            `Created automatically from purchase order ${poNumber}`,
          ],
        );
        product = createdProduct.rows[0];
      }

      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || Number(product.cost_price || product.unit_price || 0) || 0);
      subtotal += p * q;
      const normalized = {
        ...item,
        product_id: product.id,
        quotation_item_id: item.quotation_item_id || item.quote_item_id || null,
        product_name: product.product_name,
        quantity: q,
        unit_price: p,
      };
      normalizedItems.push(normalized);

      if (normalized.quotation_item_id && quoteItemColumns.has('product_id')) {
        const updates = [];
        const updateValues = [];
        updates.push(`product_id = $${updateValues.length + 1}`);
        updateValues.push(product.id);
        if (quoteItemColumns.has('unit_price')) {
          updates.push(`unit_price = CASE WHEN COALESCE(unit_price, 0) <= 0 THEN $${updateValues.length + 1} ELSE unit_price END`);
          updateValues.push(p);
        }
        if (quoteItemColumns.has('description')) {
          updates.push(`description = COALESCE(description, $${updateValues.length + 1})`);
          updateValues.push(product.product_name);
        }
        if (quoteItemColumns.has('item_description')) {
          updates.push(`item_description = COALESCE(item_description, $${updateValues.length + 1})`);
          updateValues.push(product.product_name);
        }
        updateValues.push(normalized.quotation_item_id);
        await client.query(
          `UPDATE public.quotation_items SET ${updates.join(', ')} WHERE id = $${updateValues.length}`,
          updateValues,
        );
      }
    }

    const normalizedTaxRate = Math.max(0, parseFloat(tax_rate) || 0);
    const taxAmount = Number((subtotal * normalizedTaxRate / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const columns = [];
    const values = [];

    if (poColumns.has('po_number')) {
      columns.push('po_number');
      values.push(poNumber);
    } else if (poColumns.has('po_id')) {
      columns.push('po_id');
      values.push(poNumber);
    }
    if (poColumns.has('vendor_id')) {
      columns.push('vendor_id');
      values.push(vendor_id || null);
    }
    if (poColumns.has('status')) {
      columns.push('status');
      values.push('ORDERED');
    }
    if (poColumns.has('subtotal_amount')) {
      columns.push('subtotal_amount');
      values.push(subtotal);
    }
    if (poColumns.has('tax_rate')) {
      columns.push('tax_rate');
      values.push(normalizedTaxRate);
    }
    if (poColumns.has('tax_amount')) {
      columns.push('tax_amount');
      values.push(taxAmount);
    }
    if (poColumns.has('total_amount')) {
      columns.push('total_amount');
      values.push(total);
    }
    if (poColumns.has('crm_order_id')) {
      columns.push('crm_order_id');
      values.push(linkedOrderId || null);
    }
    if (poColumns.has('quotation_id')) {
      columns.push('quotation_id');
      values.push(linkedQuotationId || null);
    }
    if (poColumns.has('notes')) {
      columns.push('notes');
      values.push([
        notes?.trim(),
        linkedOrderNumber ? `Source order: ${linkedOrderNumber}` : null,
        expected_delivery_date && !poColumns.has('expected_delivery_date') ? `Expected delivery: ${expected_delivery_date}` : null,
      ].filter(Boolean).join('\n') || null);
    }
    if (poColumns.has('created_by')) {
      columns.push('created_by');
      values.push(actorId || null);
    }

    if (poColumns.has('order_date')) {
      columns.push('order_date');
      values.push(order_date || new Date().toISOString().slice(0, 10));
    }
    if (poColumns.has('expected_delivery_date')) {
      columns.push('expected_delivery_date');
      values.push(expected_delivery_date || null);
    }

    const poRes = await client.query(
      `INSERT INTO public.purchase_orders (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      values
    );
    const po = poRes.rows[0];

    for (const item of normalizedItems) {
      const q = item.quantity;
      const p = item.unit_price;
      const itemInsertColumns = [];
      const itemValues = [];
      if (itemColumns.has('purchase_order_id')) {
        itemInsertColumns.push('purchase_order_id');
        itemValues.push(po.id);
      } else if (itemColumns.has('po_id')) {
        itemInsertColumns.push('po_id');
        itemValues.push(po.id);
      }
      if (itemColumns.has('product_id')) {
        itemInsertColumns.push('product_id');
        itemValues.push(item.product_id || null);
      }
      if (itemColumns.has('quotation_item_id')) {
        itemInsertColumns.push('quotation_item_id');
        itemValues.push(item.quotation_item_id || null);
      }
      if (itemColumns.has('product_name')) {
        itemInsertColumns.push('product_name');
        itemValues.push(item.product_name || item.remarks || 'Stock item');
      }
      if (itemColumns.has('quantity')) {
        itemInsertColumns.push('quantity');
        itemValues.push(q);
      }
      if (itemColumns.has('unit_price')) {
        itemInsertColumns.push('unit_price');
        itemValues.push(p);
      }
      if (itemColumns.has('total_price')) {
        itemInsertColumns.push('total_price');
        itemValues.push(q * p);
      }
      if (itemColumns.has('remarks')) {
        itemInsertColumns.push('remarks');
        itemValues.push(item.remarks || null);
      }
      if (itemColumns.has('received_quantity')) {
        itemInsertColumns.push('received_quantity');
        itemValues.push(0);
      }
      await client.query(
        `INSERT INTO public.purchase_order_items (${itemInsertColumns.join(', ')}) VALUES (${itemInsertColumns.map((_, index) => `$${index + 1}`).join(', ')})`,
        itemValues
      );
    }

    await client.query('COMMIT');
    return po;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function receivePurchaseOrder(id, { items = [] } = {}, actorId = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Enter received quantity for at least one purchase order item.', 400);
  }

  await ensurePurchaseOrderWorkflowColumns();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poiColumns = await getPublicTableColumns('purchase_order_items');
    const quoteItemColumns = await getPublicTableColumns('quotation_items');
    const itemJoinColumn = poiColumns.has('purchase_order_id') ? 'purchase_order_id' : 'po_id';
    const itemReceivedExpr = poiColumns.has('received_quantity') ? 'COALESCE(received_quantity, 0)' : '0';
    const itemProductNameExpr = poiColumns.has('product_name') ? 'product_name' : 'NULL';
    const itemRemarksExpr = poiColumns.has('remarks') ? 'remarks' : 'NULL';
    const itemQuotationItemExpr = poiColumns.has('quotation_item_id') ? 'quotation_item_id' : 'NULL';

    const poRes = await client.query(`SELECT * FROM public.purchase_orders WHERE id = $1 FOR UPDATE`, [id]);
    const po = poRes.rows[0];
    if (!po) {
      throw new AppError('NOT_FOUND', 'Purchase order not found.', 404);
    }

    const poNumber = po.po_number || po.po_id || po.id;
    const dbItems = await client.query(
      `
        SELECT id, product_id, ${itemProductNameExpr} AS product_name, ${itemRemarksExpr} AS remarks, ${itemQuotationItemExpr} AS quotation_item_id, quantity, unit_price, ${itemReceivedExpr} AS received_quantity
        FROM public.purchase_order_items
        WHERE ${itemJoinColumn} = $1
        FOR UPDATE
      `,
      [id],
    );

    const receiveById = new Map(items.map((item) => [String(item.id), Math.max(0, parseInt(item.received_qty ?? item.received_quantity ?? item.quantity, 10) || 0)]));
    let totalReceivedThisRun = 0;

    for (const item of dbItems.rows) {
      const receivedQty = receiveById.get(String(item.id)) || 0;
      if (receivedQty <= 0) continue;
      if (!item.product_id) {
        const productName = String(item.product_name || item.remarks || 'Purchased stock item').trim();
        const createdProduct = await client.query(
          `
            INSERT INTO public.products
              (product_name, category_id, product_type, tracking_type, quantity, min_stock_level, unit_price, cost_price, description)
            VALUES ($1, NULL, 'ASSET', 'NONE', 0, 5, $2, $2, $3)
            RETURNING id, product_name
          `,
          [productName, Math.max(0, parseFloat(item.unit_price) || 0), `Created while receiving ${poNumber}`],
        );
        item.product_id = createdProduct.rows[0].id;
        if (poiColumns.has('product_id')) {
          await client.query(`UPDATE public.purchase_order_items SET product_id = $1 WHERE id = $2`, [item.product_id, item.id]);
        }
      }
      const alreadyReceived = Number(item.received_quantity || 0);
      const orderedQty = Number(item.quantity || 0);
      if (alreadyReceived + receivedQty > orderedQty) {
        throw new AppError('VALIDATION_ERROR', 'Received quantity cannot be greater than ordered quantity.', 400);
      }

      await client.query(
        `UPDATE public.products SET quantity = COALESCE(quantity, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [receivedQty, item.product_id],
      );

      const productResult = await client.query(
        `SELECT product_name, tracking_type FROM public.products WHERE id = $1`,
        [item.product_id],
      );
      const receivedProduct = productResult.rows[0];
      if (['SERIAL', 'IMEI'].includes(String(receivedProduct?.tracking_type || '').toUpperCase())) {
        const year = new Date().getUTCFullYear();
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`inventory-serial-${year}`]);
        const serialResult = await client.query(
          `
            SELECT COALESCE(MAX(NULLIF(substring(serial_number FROM $1), '')::int), 0)::int AS last_number
            FROM public.inventory_items
            WHERE serial_number LIKE $2
          `,
          [`^SN-${year}-([0-9]+)$`, `SN-${year}-%`],
        );
        const firstNumber = Number(serialResult.rows[0]?.last_number || 0) + 1;
        for (let index = 0; index < receivedQty; index += 1) {
          const serialNumber = `SN-${year}-${String(firstNumber + index).padStart(5, '0')}`;
          await client.query(
            `
              INSERT INTO public.inventory_items
                (product_id, serial_number, current_status, location, notes)
              VALUES ($1, $2, 'AVAILABLE', 'Warehouse', $3)
            `,
            [item.product_id, serialNumber, `Auto-created while receiving ${poNumber}`],
          );
        }
      }
      await client.query(
        `UPDATE public.purchase_order_items SET received_quantity = COALESCE(received_quantity, 0) + $1 WHERE id = $2`,
        [receivedQty, item.id],
      );
      await recordInventoryMovement(client, {
        product_id: item.product_id,
        movement_type: 'STOCK_IN',
        quantity: receivedQty,
        reference_type: 'PURCHASE_ORDER_RECEIPT',
        reference_id: id,
        notes: `Received stock against ${poNumber}`,
        created_by: actorId,
      });
      if (item.quotation_item_id && quoteItemColumns.has('product_id')) {
        await client.query(
          `UPDATE public.quotation_items SET product_id = $1 WHERE id = $2`,
          [item.product_id, item.quotation_item_id],
        );
      }
      totalReceivedThisRun += receivedQty;
    }

    if (totalReceivedThisRun <= 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one received quantity must be greater than zero.', 400);
    }

    const totals = await client.query(
      `
        SELECT
          COALESCE(SUM(quantity), 0)::int AS ordered_qty,
          COALESCE(SUM(received_quantity), 0)::int AS received_qty
        FROM public.purchase_order_items
        WHERE ${itemJoinColumn} = $1
      `,
      [id],
    );
    const orderedQty = Number(totals.rows[0]?.ordered_qty || 0);
    const receivedQty = Number(totals.rows[0]?.received_qty || 0);
    const nextStatus = receivedQty >= orderedQty ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    const updateResult = await client.query(
      `
        UPDATE public.purchase_orders
        SET status = $1,
            received_at = CASE WHEN $3::boolean THEN NOW() ELSE received_at END,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [nextStatus, id, nextStatus === 'RECEIVED'],
    );

    const linkedQuotationId = po.quotation_id || null;
    const linkedOrderId = po.crm_order_id || null;
    if (linkedQuotationId || linkedOrderId) {
      let quotationIdForStatus = linkedQuotationId;
      if (!quotationIdForStatus && linkedOrderId) {
        const orderResult = await client.query(`SELECT quotation_id FROM public.crm_orders WHERE id = $1`, [linkedOrderId]);
        quotationIdForStatus = orderResult.rows[0]?.quotation_id || null;
      }
      if (quotationIdForStatus) {
        const stockStatus = await resolveOrderStockStatus(client, quotationIdForStatus);
        await client.query(
          `
            UPDATE public.crm_orders
            SET status = $1,
                updated_at = NOW()
            WHERE (
                  ($2::uuid IS NOT NULL AND id = $2)
               OR ($3::uuid IS NOT NULL AND quotation_id = $3)
            )
              AND status IN ('PENDING_REVIEW', 'READY_FOR_INVENTORY', 'TOKEN_GENERATED', 'AWAITING_STOCK', 'STOCK_OK')
          `,
          [stockStatus, linkedOrderId, quotationIdForStatus],
        );
      }
    }

    await client.query('COMMIT');
    return {
      ...updateResult.rows[0],
      po_number: updateResult.rows[0].po_number || updateResult.rows[0].po_id || updateResult.rows[0].id,
      received_quantity: receivedQty,
      ordered_quantity: orderedQty,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Invoices
export async function getInvoices() {
  const invoiceColumns = await getPublicTableColumns('invoices');
  const invoiceNumberExpr = invoiceColumns.has('invoice_number')
    ? 'inv.invoice_number'
    : invoiceColumns.has('invoice_id')
      ? 'inv.invoice_id'
      : 'inv.id::text';
  const invoiceStatusExpr = invoiceColumns.has('status')
    ? 'inv.status'
    : 'COALESCE(inv.approval_status, inv.payment_status, \'PENDING\')';
  const customerJoin = invoiceColumns.has('customer_id')
    ? 'LEFT JOIN public.customers c ON c.id = inv.customer_id'
    : 'LEFT JOIN public.quotations q ON q.id = inv.quotation_id LEFT JOIN public.customers c ON c.id = q.customer_id';

  const result = await pool.query(`
    SELECT inv.*, ${invoiceNumberExpr} AS invoice_number, ${invoiceStatusExpr} AS status, c.customer_name, COUNT(ii.id)::int AS item_count
    FROM public.invoices inv
    ${customerJoin}
    LEFT JOIN public.invoice_items ii ON ii.invoice_id = inv.id
    GROUP BY inv.id, c.customer_name
    ORDER BY inv.created_at DESC
  `);
  return result.rows;
}

export async function createInvoice({ customer_id, items = [], due_date, notes }, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceColumns = await getPublicTableColumns('invoices');
    const itemColumns = await getPublicTableColumns('invoice_items');
    const invoiceNo = await nextInventoryInvoiceNumber(client);
    let total = 0;
    items.forEach((item) => {
      total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
    });

    const columns = [];
    const values = [];

    if (invoiceColumns.has('invoice_number')) {
      columns.push('invoice_number');
      values.push(invoiceNo);
    } else if (invoiceColumns.has('invoice_id')) {
      columns.push('invoice_id');
      values.push(invoiceNo);
    }
    if (invoiceColumns.has('customer_id')) {
      columns.push('customer_id');
      values.push(customer_id || null);
    }
    if (invoiceColumns.has('status')) {
      columns.push('status');
      values.push('ISSUED');
    }
    if (invoiceColumns.has('approval_status')) {
      columns.push('approval_status');
      values.push('APPROVED');
    }
    if (invoiceColumns.has('payment_status')) {
      columns.push('payment_status');
      values.push('UNPAID');
    }
    if (invoiceColumns.has('total_amount')) {
      columns.push('total_amount');
      values.push(total);
    }
    if (invoiceColumns.has('due_date')) {
      columns.push('due_date');
      values.push(due_date || null);
    }
    if (invoiceColumns.has('notes')) {
      columns.push('notes');
      values.push(notes?.trim() || null);
    } else if (invoiceColumns.has('remarks')) {
      columns.push('remarks');
      values.push(notes?.trim() || null);
    }
    if (invoiceColumns.has('created_by')) {
      columns.push('created_by');
      values.push(actorId || null);
    }

    const invRes = await client.query(
      `INSERT INTO public.invoices (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      values,
    );
    const invoice = invRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await insertInvoiceItemRow(client, itemColumns, invoice.id, item);
      if (item.product_id) {
        await client.query(`UPDATE public.products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`, [q, item.product_id]);
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          movement_type: 'STOCK_OUT',
          quantity: q,
          reference_type: 'INVOICE',
          reference_id: invoice.id,
          notes: item.remarks || `Invoice ${invoice.invoice_number || invoice.invoice_id || invoiceNo} stock issued`,
          created_by: actorId,
        });
      }
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

// Tracker Installations & Complaints
export async function getInstallations() {
  const result = await pool.query(`
    SELECT ti.*, c.customer_name, v.vehicle_number, ii.serial_number AS tracker_serial
    FROM public.tracker_installations ti
    JOIN public.customers c ON c.id = ti.customer_id
    LEFT JOIN public.customer_vehicles v ON v.id = ti.vehicle_id
    LEFT JOIN public.inventory_items ii ON ii.id = ti.tracker_item_id
    ORDER BY ti.created_at DESC
  `);
  return result.rows;
}

export async function createInstallation({ customer_id, vehicle_id, tracker_item_id, technician_name, notes }, actorId = null) {
  if (!customer_id) throw new AppError('VALIDATION_ERROR', 'Customer is required.', 400);
  const instNo = `INS-${Date.now().toString().slice(-6)}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO public.tracker_installations (installation_no, customer_id, vehicle_id, tracker_item_id, technician_name, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'INSTALLED', $6) RETURNING *`,
      [instNo, customer_id, vehicle_id || null, tracker_item_id || null, technician_name?.trim() || null, notes?.trim() || null]
    );

    if (tracker_item_id) {
      const itemRes = await client.query(
        `UPDATE public.inventory_items SET current_status = 'INSTALLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [tracker_item_id]
      );
      const item = itemRes.rows[0];
      if (item) {
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          inventory_item_id: item.id,
          movement_type: 'STOCK_OUT',
          quantity: 1,
          reference_type: 'INSTALLATION',
          reference_id: result.rows[0].id,
          notes: `Installed for ${technician_name?.trim() || 'technician'}`,
          created_by: actorId,
        });
      }
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getComplaints() {
  const complaintColumns = await getPublicTableColumns('customer_complaints');
  const result = await pool.query(`
    SELECT
      comp.*,
      ${complaintColumns.has('priority') ? 'comp.priority' : "'MEDIUM'"} AS priority,
      ${complaintColumns.has('crm_order_id') ? 'comp.crm_order_id' : 'NULL'} AS crm_order_id,
      c.customer_name,
      ii.serial_number AS tracker_serial,
      ${complaintColumns.has('crm_order_id') ? 'o.order_number' : 'NULL'} AS order_number
    FROM public.customer_complaints comp
    JOIN public.customers c ON c.id = comp.customer_id
    LEFT JOIN public.inventory_items ii ON ii.id = comp.tracker_item_id
    ${complaintColumns.has('crm_order_id') ? 'LEFT JOIN public.crm_orders o ON o.id = comp.crm_order_id' : ''}
    ORDER BY comp.reported_at DESC
  `);
  return result.rows;
}

export async function createComplaint({
  customer_id,
  tracker_item_id,
  crm_order_id,
  order_id,
  complaint_type = 'CLIENT_COMPLAINT',
  priority = 'MEDIUM',
  description,
}) {
  if (!customer_id) throw new AppError('VALIDATION_ERROR', 'Customer is required.', 400);
  if (!description || !description.trim()) throw new AppError('VALIDATION_ERROR', 'Complaint description is required.', 400);
  const complaintColumns = await getPublicTableColumns('customer_complaints');
  const compNo = `CMP-${Date.now().toString().slice(-6)}`;
  const normalizedPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(String(priority).toUpperCase())
    ? String(priority).toUpperCase()
    : 'MEDIUM';
  const values = {
    complaint_no: compNo,
    customer_id,
    tracker_item_id: tracker_item_id || null,
    crm_order_id: crm_order_id || order_id || null,
    complaint_type: complaint_type || 'CLIENT_COMPLAINT',
    priority: normalizedPriority,
    status: 'TAKEN',
    description: description.trim(),
  };
  const insertColumns = Object.keys(values).filter((column) => complaintColumns.has(column));
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `INSERT INTO public.customer_complaints (${insertColumns.join(', ')})
     VALUES (${placeholders}) RETURNING *`,
    insertColumns.map((column) => values[column])
  );
  return result.rows[0];
}

export async function createReplacement({ complaint_id, old_inventory_item_id, new_inventory_item_id, reason }, actorId = null) {
  const repNo = `REP-${Date.now().toString().slice(-6)}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO public.item_replacements (replacement_no, complaint_id, old_inventory_item_id, new_inventory_item_id, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [repNo, complaint_id || null, old_inventory_item_id || null, new_inventory_item_id || null, reason?.trim() || null]
    );

    if (old_inventory_item_id) {
      const oldItemRes = await client.query(
        `UPDATE public.inventory_items SET current_status = 'DAMAGED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [old_inventory_item_id]
      );
      const oldItem = oldItemRes.rows[0];
      if (oldItem) {
        await recordInventoryMovement(client, {
          product_id: oldItem.product_id,
          inventory_item_id: oldItem.id,
          movement_type: 'STOCK_OUT',
          quantity: 1,
          reference_type: 'REPLACEMENT',
          reference_id: result.rows[0].id,
          notes: reason?.trim() || 'Old item marked damaged during replacement',
          created_by: actorId,
        });
      }
    }
    if (new_inventory_item_id) {
      const newItemRes = await client.query(
        `UPDATE public.inventory_items SET current_status = 'INSTALLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [new_inventory_item_id]
      );
      const newItem = newItemRes.rows[0];
      if (newItem) {
        await recordInventoryMovement(client, {
          product_id: newItem.product_id,
          inventory_item_id: newItem.id,
          movement_type: 'STOCK_OUT',
          quantity: 1,
          reference_type: 'REPLACEMENT',
          reference_id: result.rows[0].id,
          notes: reason?.trim() || 'Replacement item installed',
          created_by: actorId,
        });
      }
    }
    if (complaint_id) {
      await client.query(`UPDATE public.customer_complaints SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1`, [complaint_id]);
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Helper: Safe JSON array parser for SQA robustness
function normalizeJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Customer Invoice Draft Templates & Generation
export async function getCustomerInvoiceDraft(customerId) {
  let result = await pool.query(
    `SELECT cid.*, c.customer_name
     FROM public.customer_invoice_drafts cid
     JOIN public.customers c ON c.id = cid.customer_id
     WHERE cid.customer_id = $1`,
    [customerId]
  );

  if (result.rows.length === 0) {
    // Check if customer exists
    const custRes = await pool.query(`SELECT customer_name FROM public.customers WHERE id = $1`, [customerId]);
    if (custRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Customer not found.', 404);

    const inserted = await pool.query(
      `INSERT INTO public.customer_invoice_drafts (customer_id, payment_terms, custom_notes, template_items)
       VALUES ($1, 'NET30', $2, '[]'::jsonb) RETURNING *`,
      [customerId, `Special Draft Template for ${custRes.rows[0].customer_name}.`]
    );
    const row = inserted.rows[0];
    return { ...row, customer_name: custRes.rows[0].customer_name, template_items: normalizeJsonArray(row.template_items) };
  }

  const row = result.rows[0];
  return { ...row, template_items: normalizeJsonArray(row.template_items) };
}

export async function upsertCustomerInvoiceDraft(customerId, { payment_terms = 'NET30', default_discount_pct = 0, custom_notes, template_items = [] }) {
  const jsonPayload = typeof template_items === 'string' ? template_items : JSON.stringify(Array.isArray(template_items) ? template_items : []);

  const result = await pool.query(
    `INSERT INTO public.customer_invoice_drafts (customer_id, payment_terms, default_discount_pct, custom_notes, template_items, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     ON CONFLICT (customer_id) DO UPDATE
     SET payment_terms = EXCLUDED.payment_terms,
         default_discount_pct = EXCLUDED.default_discount_pct,
         custom_notes = EXCLUDED.custom_notes,
         template_items = EXCLUDED.template_items,
         updated_at = NOW()
     RETURNING *`,
    [
      customerId,
      payment_terms,
      Math.max(0, parseFloat(default_discount_pct) || 0),
      custom_notes?.trim() || null,
      jsonPayload,
    ]
  );
  const row = result.rows[0];
  return { ...row, template_items: normalizeJsonArray(row.template_items) };
}

export async function generateDraftInvoiceFromCustomerTemplate(customerId) {
  const draftTemplate = await getCustomerInvoiceDraft(customerId);
  const items = normalizeJsonArray(draftTemplate.template_items);

  let subtotal = 0;
  items.forEach((item) => {
    subtotal += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
  });

  const discount = (subtotal * (parseFloat(draftTemplate.default_discount_pct) || 0)) / 100;
  const finalTotal = Math.max(0, subtotal - discount);

  // Compute due date based on payment_terms
  const dueDate = new Date();
  if (draftTemplate.payment_terms === 'NET15') dueDate.setDate(dueDate.getDate() + 15);
  else if (draftTemplate.payment_terms === 'NET30') dueDate.setDate(dueDate.getDate() + 30);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceColumns = await getPublicTableColumns('invoices');
    const itemColumns = await getPublicTableColumns('invoice_items');
    const invoiceNo = await nextInventoryInvoiceNumber(client);
    const columns = [];
    const values = [];

    if (invoiceColumns.has('invoice_number')) {
      columns.push('invoice_number');
      values.push(invoiceNo);
    } else if (invoiceColumns.has('invoice_id')) {
      columns.push('invoice_id');
      values.push(invoiceNo);
    }
    if (invoiceColumns.has('customer_id')) {
      columns.push('customer_id');
      values.push(customerId);
    }
    if (invoiceColumns.has('status')) {
      columns.push('status');
      values.push('DRAFT');
    }
    if (invoiceColumns.has('approval_status')) {
      columns.push('approval_status');
      values.push('PENDING');
    }
    if (invoiceColumns.has('payment_status')) {
      columns.push('payment_status');
      values.push('UNPAID');
    }
    if (invoiceColumns.has('total_amount')) {
      columns.push('total_amount');
      values.push(finalTotal);
    }
    if (invoiceColumns.has('due_date')) {
      columns.push('due_date');
      values.push(dueDate.toISOString().split('T')[0]);
    }
    if (invoiceColumns.has('notes')) {
      columns.push('notes');
      values.push(draftTemplate.custom_notes);
    } else if (invoiceColumns.has('remarks')) {
      columns.push('remarks');
      values.push(draftTemplate.custom_notes);
    }

    const invRes = await client.query(
      `INSERT INTO public.invoices (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      values,
    );
    const invoice = invRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await insertInvoiceItemRow(client, itemColumns, invoice.id, {
        ...item,
        quantity: q,
        unit_price: p,
        remarks: item.item_description || 'Template Item',
      });
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

