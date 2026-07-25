import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function getInventorySummary() {
  const [productStats, serialStats, workflowStats] = await Promise.all([
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
  ]);

  return {
    ...productStats.rows[0],
    ...serialStats.rows[0],
    ...workflowStats.rows[0],
  };
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

export async function createInventoryItem(data) {
  const { product_id, serial_number, imei, current_status = 'AVAILABLE', location, notes } = data;

  if (!product_id) {
    throw new AppError('VALIDATION_ERROR', 'Product ID is required.', 400);
  }

  const result = await pool.query(
    `
    INSERT INTO public.inventory_items (product_id, serial_number, imei, current_status, location, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      product_id,
      serial_number?.trim() || null,
      imei?.trim() || null,
      ['AVAILABLE', 'ALLOCATED', 'INSTALLED', 'RETURNED', 'DAMAGED'].includes(current_status.toUpperCase()) ? current_status.toUpperCase() : 'AVAILABLE',
      location?.trim() || null,
      notes?.trim() || null,
    ]
  );
  return result.rows[0];
}

export async function updateInventoryItem(id, data) {
  const { current_status, location, notes, serial_number, imei } = data;

  const result = await pool.query(
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
      current_status ? current_status.toUpperCase() : null,
      location ? location.trim() : null,
      notes ? notes.trim() : null,
      serial_number ? serial_number.trim() : null,
      imei ? imei.trim() : null,
      id,
    ]
  );

  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Inventory item not found.', 404);
  }
  return result.rows[0];
}

export async function deleteInventoryItem(id) {
  const result = await pool.query(`DELETE FROM public.inventory_items WHERE id = $1 RETURNING id`, [id]);
  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Inventory item not found.', 404);
  }
  return { deleted: true };
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

export async function getCustomers() {
  const result = await pool.query(`
    SELECT c.*, COUNT(v.id)::int AS vehicle_count
    FROM public.customers c
    LEFT JOIN public.customer_vehicles v ON v.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.customer_name ASC
  `);
  return result.rows;
}

export async function createCustomer({ customer_name, contact_person, email, phone, address }) {
  if (!customer_name || !customer_name.trim()) throw new AppError('VALIDATION_ERROR', 'Customer name is required.', 400);
  const result = await pool.query(
    `INSERT INTO public.customers (customer_name, contact_person, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [customer_name.trim(), contact_person?.trim() || null, email?.trim() || null, phone?.trim() || null, address?.trim() || null]
  );
  return result.rows[0];
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

export async function createPurchaseOrder({ vendor_id, items = [], notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    let total = 0;
    items.forEach((item) => {
      total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
    });

    const poRes = await client.query(
      `INSERT INTO public.purchase_orders (po_number, vendor_id, status, total_amount, notes) VALUES ($1, $2, 'ORDERED', $3, $4) RETURNING *`,
      [poNumber, vendor_id || null, total, notes?.trim() || null]
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

export async function createInvoice({ customer_id, items = [], due_date, notes }) {
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

export async function createInstallation({ customer_id, vehicle_id, tracker_item_id, technician_name, notes }) {
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
      await client.query(`UPDATE public.inventory_items SET current_status = 'INSTALLED' WHERE id = $1`, [tracker_item_id]);
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

export async function createReplacement({ complaint_id, old_inventory_item_id, new_inventory_item_id, reason }) {
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
      await client.query(`UPDATE public.inventory_items SET current_status = 'DAMAGED' WHERE id = $1`, [old_inventory_item_id]);
    }
    if (new_inventory_item_id) {
      await client.query(`UPDATE public.inventory_items SET current_status = 'INSTALLED' WHERE id = $1`, [new_inventory_item_id]);
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

