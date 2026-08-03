import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function getInventorySummary() {
  const [productStats, serialStats, workflowStats, csrStats] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_products,
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
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved_csr_jobs,
        COUNT(*) FILTER (WHERE status = 'SENT')::int AS sent_csr_quotes
      FROM public.quotations
    `),
  ]);

  return {
    ...productStats.rows[0],
    ...serialStats.rows[0],
    ...workflowStats.rows[0],
    ...csrStats.rows[0],
  };
}

export async function getInventoryWorkQueue() {
  const quoteColumns = await getPublicTableColumns('quotations');
  const quoteNumberExpr = quoteColumns.has('quotation_number')
    ? 'q.quotation_number'
    : quoteColumns.has('quotation_id')
      ? 'q.quotation_id'
      : 'q.id::text';
  const priceTierExpr = quoteColumns.has('price_tier') ? 'q.price_tier' : "'Standard'";
  const templateExpr = quoteColumns.has('template_style') ? 'q.template_style' : "'HBL Sales Tax Invoice'";
  const updatedExpr = quoteColumns.has('updated_at') ? 'q.updated_at' : 'q.created_at';

  const result = await pool.query(
    `
      SELECT
        q.id,
        ${quoteNumberExpr} AS quotation_number,
        q.customer_id,
        c.customer_name,
        ${priceTierExpr} AS price_tier,
        ${templateExpr} AS template_style,
        q.status,
        q.total_amount,
        q.created_at,
        ${updatedExpr} AS updated_at,
        COALESCE(COUNT(qi.id), 0)::int AS item_count,
        COALESCE(SUM(qi.quantity), 0)::int AS total_requested_qty
      FROM public.quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      LEFT JOIN public.quotation_items qi ON qi.quotation_id = q.id
      WHERE q.status IN ('APPROVED', 'IN_PROGRESS')
      GROUP BY q.id, c.customer_name
      ORDER BY ${updatedExpr} DESC
      LIMIT 25
    `
  );
  return result.rows;
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

  let query = `
    SELECT
      p.*,
      ic.category_name,
      COUNT(ii.id)::int AS serial_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'AVAILABLE')::int AS available_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'ALLOCATED')::int AS allocated_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'INSTALLED')::int AS installed_count,
      COUNT(ii.id) FILTER (WHERE ii.current_status = 'DAMAGED')::int AS damaged_count
    FROM public.products p
    LEFT JOIN public.item_categories ic ON ic.id = p.category_id
    LEFT JOIN public.inventory_items ii ON ii.product_id = p.id
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
    GROUP BY p.id, ic.category_name
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
  const result = await pool.query(`SELECT * FROM public.vendors ORDER BY name ASC`);
  return result.rows;
}

export async function createVendor({ name, contact_person, email, phone, address }) {
  if (!name || !name.trim()) throw new AppError('VALIDATION_ERROR', 'Vendor name is required.', 400);
  const result = await pool.query(
    `INSERT INTO public.vendors (name, contact_person, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name.trim(), contact_person?.trim() || null, email?.trim() || null, phone?.trim() || null, address?.trim() || null]
  );
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

    const columns = await getPublicTableColumns('inventory_movements');
    const valuesByColumn = {
      product_id: data.product_id || null,
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
      p.product_name,
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
  const result = await pool.query(`
    SELECT po.*, v.name AS vendor_name, COUNT(poi.id)::int AS item_count
    FROM public.purchase_orders po
    LEFT JOIN public.vendors v ON v.id = po.vendor_id
    LEFT JOIN public.purchase_order_items poi ON poi.po_id = po.id
    GROUP BY po.id, v.name
    ORDER BY po.created_at DESC
  `);
  return result.rows;
}

export async function createPurchaseOrder({ vendor_id, items = [], notes, order_date, expected_delivery_date }, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const poColumns = await getPublicTableColumns('purchase_orders');
    let total = 0;
    items.forEach((item) => {
      total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
    });

    const columns = ['po_number', 'vendor_id', 'status', 'total_amount', 'notes'];
    const values = [
      poNumber,
      vendor_id || null,
      'ORDERED',
      total,
      [
        notes?.trim(),
        expected_delivery_date && !poColumns.has('expected_delivery_date') ? `Expected delivery: ${expected_delivery_date}` : null,
      ].filter(Boolean).join('\n') || null,
    ];

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

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await client.query(
        `INSERT INTO public.purchase_order_items (po_id, product_id, quantity, unit_price, total_price, remarks) VALUES ($1, $2, $3, $4, $5, $6)`,
        [po.id, item.product_id, q, p, q * p, item.remarks || null]
      );
      // Increase product quantity stock
      if (item.product_id) {
        await client.query(`UPDATE public.products SET quantity = quantity + $1 WHERE id = $2`, [q, item.product_id]);
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          movement_type: 'STOCK_IN',
          quantity: q,
          reference_type: 'PURCHASE_ORDER',
          reference_id: po.id,
          notes: item.remarks || `PO ${po.po_number} stock received`,
          created_by: actorId,
        });
      }
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

// Invoices
export async function getInvoices() {
  const result = await pool.query(`
    SELECT inv.*, c.customer_name, COUNT(ii.id)::int AS item_count
    FROM public.invoices inv
    LEFT JOIN public.customers c ON c.id = inv.customer_id
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
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    let total = 0;
    items.forEach((item) => {
      total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
    });

    const invRes = await client.query(
      `INSERT INTO public.invoices (invoice_number, customer_id, status, total_amount, due_date, notes) VALUES ($1, $2, 'ISSUED', $3, $4, $5) RETURNING *`,
      [invoiceNo, customer_id || null, total, due_date || null, notes?.trim() || null]
    );
    const invoice = invRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await client.query(
        `INSERT INTO public.invoice_items (invoice_id, product_id, quantity, unit_price, total_price, remarks) VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.product_id, q, p, q * p, item.remarks || null]
      );
      if (item.product_id) {
        await client.query(`UPDATE public.products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`, [q, item.product_id]);
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          movement_type: 'STOCK_OUT',
          quantity: q,
          reference_type: 'INVOICE',
          reference_id: invoice.id,
          notes: item.remarks || `Invoice ${invoice.invoice_number} stock issued`,
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
  const result = await pool.query(`
    SELECT comp.*, c.customer_name, ii.serial_number AS tracker_serial
    FROM public.customer_complaints comp
    JOIN public.customers c ON c.id = comp.customer_id
    LEFT JOIN public.inventory_items ii ON ii.id = comp.tracker_item_id
    ORDER BY comp.reported_at DESC
  `);
  return result.rows;
}

export async function createComplaint({ customer_id, tracker_item_id, complaint_type = 'DEVICE_OFFLINE', description }) {
  if (!customer_id) throw new AppError('VALIDATION_ERROR', 'Customer is required.', 400);
  const compNo = `CMP-${Date.now().toString().slice(-6)}`;
  const result = await pool.query(
    `INSERT INTO public.customer_complaints (complaint_no, customer_id, tracker_item_id, complaint_type, status, description)
     VALUES ($1, $2, $3, $4, 'TAKEN', $5) RETURNING *`,
    [compNo, customer_id, tracker_item_id || null, complaint_type, description?.trim() || null]
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
    const invoiceNo = `INV-DRAFT-${Date.now().toString().slice(-6)}`;
    const invRes = await client.query(
      `INSERT INTO public.invoices (invoice_number, customer_id, status, total_amount, due_date, notes)
       VALUES ($1, $2, 'DRAFT', $3, $4, $5) RETURNING *`,
      [invoiceNo, customerId, finalTotal, dueDate.toISOString().split('T')[0], draftTemplate.custom_notes]
    );
    const invoice = invRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await client.query(
        `INSERT INTO public.invoice_items (invoice_id, product_id, quantity, unit_price, total_price, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.product_id || null, q, p, q * p, item.item_description || 'Template Item']
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

