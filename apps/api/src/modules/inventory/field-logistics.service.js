import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { recordInventoryMovement } from './inventory.service.js';
import { publishInventoryEvent } from './inventory-events.js';
import { createClientInvoiceFromDispatch } from '../invoicing/invoicing.service.js';

function returnRequestNumber(dispatchNumber = '') {
  const normalized = String(dispatchNumber || '');
  const match = normalized.match(/^DSP-(\d{4})-(\d+)$/);
  if (match) return `RTN-${match[1]}-${String(match[2]).padStart(4, '0')}`;
  return normalized ? normalized.replace(/^DSP-/, 'RTN-') : `RTN-${new Date().getUTCFullYear()}-PENDING`;
}

function mapReturnStatus(dispatchStatus) {
  const status = String(dispatchStatus || '').toUpperCase();
  if (status === 'NO_CHARGE') return 'NO_CHARGE';
  if (status === 'BILL_SENT') return 'STOCK_UPDATED';
  if (status === 'RETURN_CONFIRMED' || status === 'COMPLETED' || status === 'RECONCILED') return 'CONFIRMED';
  return 'PENDING';
}

function conditionLabel(condition) {
  const value = String(condition || 'GOOD').toUpperCase();
  if (value === 'DAMAGED') return 'Damaged';
  if (value === 'CONSUMABLE_USED') return 'Consumable used';
  return 'Good';
}

function toAmount(value, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function buildBillAdjustment(dispatch = {}) {
  const items = dispatch.items || [];
  const extraPurchases = dispatch.on_the_go_purchases || [];
  const originalAmount = items.reduce(
    (sum, item) => sum + toAmount(item.quantity_issued) * toAmount(item.unit_price),
    0,
  );
  const returnedAmount = items.reduce(
    (sum, item) => sum + toAmount(item.quantity_returned) * toAmount(item.unit_price),
    0,
  );
  const extraAmount = extraPurchases.reduce((sum, item) => sum + toAmount(item.amount), 0);
  return {
    original_installed_amount: originalAmount,
    returned_deduction_amount: returnedAmount,
    extra_added_amount: extraAmount,
    final_adjusted_total: Math.max(0, originalAmount - returnedAmount + extraAmount),
  };
}

export async function createDispatch(data, actorId = null) {
  // installer_id is retained in the database contract as the assigned field technician identifier.
  if (!data?.installer_id) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Installer is required before dispatch can be confirmed.');
  }

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM public.installer_field_dispatches`);
  const seq = (countRes.rows[0].total || 0) + 1;
  const dispatchNum = `DSP-${new Date().getUTCFullYear()}-${String(seq).padStart(4, '0')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (data.quotation_id) {
      const readyRes = await client.query(
        `
          SELECT
            o.id,
            o.token_number,
            o.status,
            COALESCE(item_stats.item_count, 0)::int AS item_count,
            COALESCE(item_stats.shortage_items, 0)::int AS shortage_items
          FROM public.crm_orders o
          LEFT JOIN LATERAL (
            SELECT
              COUNT(qi.id)::int AS item_count,
              COUNT(qi.id) FILTER (
                WHERE qi.product_id IS NULL
                   OR COALESCE(p.quantity, 0) < COALESCE(qi.quantity, 1)
              )::int AS shortage_items
            FROM public.quotation_items qi
            LEFT JOIN public.products p ON p.id = qi.product_id
            WHERE qi.quotation_id = o.quotation_id
          ) item_stats ON TRUE
          WHERE o.quotation_id = $1
          FOR UPDATE OF o
        `,
        [data.quotation_id],
      );
      const readyOrder = readyRes.rows[0];
      if (!readyOrder) {
        throw new AppError(404, 'NOT_FOUND', 'Ready dispatch order was not found.');
      }
      if (!readyOrder.token_number) {
        throw new AppError(400, 'TOKEN_REQUIRED', 'Generate token before creating dispatch.');
      }
      if (
        readyOrder.status !== 'STOCK_OK'
        || Number(readyOrder.item_count || 0) === 0
        || Number(readyOrder.shortage_items || 0) > 0
      ) {
        throw new AppError(400, 'ORDER_NOT_STOCK_READY', 'Dispatch can only be created for STOCK_OK orders. Create/receive PO for missing stock first.');
      }

      const existingDispatch = await client.query(
        `
          SELECT id, dispatch_number
          FROM public.installer_field_dispatches
          WHERE quotation_id = $1
            AND COALESCE(status, '') <> 'CANCELLED'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [data.quotation_id],
      );
      if (existingDispatch.rows[0]) {
        throw new AppError(409, 'DISPATCH_ALREADY_EXISTS', `${existingDispatch.rows[0].dispatch_number} already exists for this order.`);
      }
    }

    const dRes = await client.query(
      `
        INSERT INTO public.installer_field_dispatches (
          dispatch_number, quotation_id, customer_id, installer_id, site_address, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'DISPATCHED')
        RETURNING *
      `,
      [
        dispatchNum,
        data.quotation_id || null,
        data.customer_id,
        data.installer_id,
        data.site_address || null,
        data.notes || null,
      ]
    );
    const dispatch = dRes.rows[0];

    const requestItems = Array.isArray(data.items) ? data.items : [];
    let items = requestItems.filter(
      (item) => item?.product_id || item?.inventory_item_id || Number(item?.unit_price || 0) > 0,
    );

    if (!items.length && data.quotation_id) {
      const quoteItems = await client.query(
        `
          SELECT product_id, quantity, unit_price
          FROM public.quotation_items
          WHERE quotation_id = $1
            AND product_id IS NOT NULL
        `,
        [data.quotation_id],
      );
      items = quoteItems.rows.map((item) => ({
        product_id: item.product_id,
        quantity_issued: item.quantity || 1,
        unit_price: item.unit_price || 0,
        unit_of_measure: 'UNITS',
      }));
    }

    for (const item of items) {
      const issuedQty = Math.max(1, Math.round(Number(item.quantity_issued || 1)));
      let productId = item.product_id || null;

      if (item.inventory_item_id && !productId) {
        const invItemRes = await client.query(
          `SELECT product_id FROM public.inventory_items WHERE id = $1`,
          [item.inventory_item_id],
        );
        productId = invItemRes.rows[0]?.product_id || null;
      }

      const productRes = productId
        ? await client.query(
            `SELECT id, product_name, tracking_type, COALESCE(quantity, 0)::numeric AS quantity FROM public.products WHERE id = $1 FOR UPDATE`,
            [productId],
          )
        : { rows: [] };
      const product = productRes.rows[0];

      if (product && Number(product.quantity || 0) < issuedQty) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', `${product.product_name || 'Product'} has only ${product.quantity} in stock.`);
      }

      const isSerialProduct = product && ['SERIAL', 'IMEI'].includes(String(product.tracking_type || '').toUpperCase());

      if (isSerialProduct && !item.inventory_item_id) {
        const serialRes = await client.query(
          `
            SELECT *
            FROM public.inventory_items
            WHERE product_id = $1
              AND current_status = 'AVAILABLE'
            ORDER BY created_at ASC, id ASC
            LIMIT $2
            FOR UPDATE
          `,
          [productId, issuedQty],
        );
        if (serialRes.rows.length < issuedQty) {
          throw new AppError(400, 'SERIALS_REQUIRED', `${product.product_name || 'Serial product'} needs ${issuedQty} available serial(s) before dispatch.`);
        }

        for (const serialItem of serialRes.rows) {
          await client.query(
            `
              INSERT INTO public.installer_dispatch_items (
                dispatch_id, product_id, inventory_item_id, quantity_issued, quantity_used, quantity_returned, unit_of_measure, unit_price
              )
              VALUES ($1, $2, $3, 1, 0, 0, $4, $5)
            `,
            [
              dispatch.id,
              productId,
              serialItem.id,
              item.unit_of_measure || 'UNITS',
              item.unit_price || 0,
            ],
          );
          await client.query(
            `UPDATE public.inventory_items SET current_status = 'ALLOCATED', updated_at = NOW() WHERE id = $1`,
            [serialItem.id],
          );
          await recordInventoryMovement(client, {
            product_id: productId,
            inventory_item_id: serialItem.id,
            movement_type: 'STOCK_OUT',
            quantity: 1,
            reference_type: 'FIELD_DISPATCH',
            reference_id: dispatch.id,
            notes: `Issued to field team for assignment ${dispatch.dispatch_number}`,
            created_by: actorId,
          });
        }

        await client.query(
          `UPDATE public.products SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1`,
          [productId, issuedQty],
        );
        continue;
      }

      await client.query(
        `
          INSERT INTO public.installer_dispatch_items (
            dispatch_id, product_id, inventory_item_id, quantity_issued, quantity_used, quantity_returned, unit_of_measure, unit_price
          )
          VALUES ($1, $2, $3, $4, 0, 0, $5, $6)
        `,
        [
          dispatch.id,
          productId || null,
          item.inventory_item_id || null,
          issuedQty,
          item.unit_of_measure || 'UNITS',
          item.unit_price || 0,
        ]
      );

      // If specific serial item, update status to ALLOCATED
      if (item.inventory_item_id) {
        const itemRes = await client.query(
          `UPDATE public.inventory_items SET current_status = 'ALLOCATED', updated_at = NOW() WHERE id = $1 RETURNING *`,
          [item.inventory_item_id]
        );
        const inventoryItem = itemRes.rows[0];
        if (inventoryItem) {
          await recordInventoryMovement(client, {
            product_id: inventoryItem.product_id,
            inventory_item_id: inventoryItem.id,
            movement_type: 'STOCK_OUT',
            quantity: issuedQty,
            reference_type: 'FIELD_DISPATCH',
            reference_id: dispatch.id,
            notes: `Issued to field team for assignment ${dispatch.dispatch_number}`,
            created_by: actorId,
          });
        }
        if (inventoryItem?.product_id) {
          await client.query(
            `UPDATE public.products SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1`,
            [inventoryItem.product_id, issuedQty],
          );
        }
      } else if (productId) {
        await client.query(
          `UPDATE public.products SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1`,
          [productId, issuedQty],
        );
        await recordInventoryMovement(client, {
          product_id: productId,
          movement_type: 'STOCK_OUT',
          quantity: issuedQty,
          reference_type: 'FIELD_DISPATCH',
          reference_id: dispatch.id,
          notes: `Issued to field team for assignment ${dispatch.dispatch_number}`,
          created_by: actorId,
        });
      }
    }

    if (data.quotation_id) {
      await client.query(
        `
          WITH required AS (
            SELECT COALESCE(SUM(quantity), 0)::numeric AS required_qty
            FROM public.quotation_items
            WHERE quotation_id = $1
          ),
          dispatched AS (
            SELECT COALESCE(SUM(di.quantity_issued), 0)::numeric AS dispatched_qty
            FROM public.installer_field_dispatches d
            JOIN public.installer_dispatch_items di ON di.dispatch_id = d.id
            WHERE d.quotation_id = $1
              AND COALESCE(d.status, '') <> 'CANCELLED'
          )
          UPDATE public.crm_orders o
          SET status = CASE
                WHEN (SELECT required_qty FROM required) > 0
                  AND (SELECT dispatched_qty FROM dispatched) >= (SELECT required_qty FROM required)
                  THEN 'FULLY_DISPATCHED'
                ELSE 'PARTIALLY_DISPATCHED'
              END,
              technical_status = 'IN_PROGRESS',
              updated_at = NOW()
          WHERE o.quotation_id = $1
            AND o.token_number IS NOT NULL
            AND o.status NOT IN ('COMPLETED', 'BILL_SENT', 'CANCELLED')
        `,
        [data.quotation_id],
      );
    }

    // Quotation remains APPROVED in CRM; dispatch progress is tracked on the dispatch/order records.
    if (data.quotation_id) {
      await client.query(
        `UPDATE public.quotations SET technical_handoff_at = COALESCE(technical_handoff_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [data.quotation_id],
      );
    }

    await client.query('COMMIT');
    publishInventoryEvent('stock.changed', {
      reason: 'material_dispatched',
      dispatch_id: dispatch.id,
      dispatch_number: dispatch.dispatch_number,
    });
    return dispatch;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listDispatches(filters = {}) {
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`d.status = $${params.length}`);
  }
  if (filters.installer_id) {
    params.push(filters.installer_id);
    where.push(`d.installer_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT
        d.*,
        c.customer_name,
        COALESCE(NULLIF(ei.name, ''), u.email, 'Field technician not assigned') AS installer_name,
        u.email AS installer_email,
        q.quotation_number,
        o.order_number,
        o.token_number,
        COALESCE(item_stats.item_count, 0)::int AS item_count
      FROM public.installer_field_dispatches d
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.users u ON u.id = d.installer_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      LEFT JOIN public.quotations q ON q.id = d.quotation_id
      LEFT JOIN public.crm_orders o ON o.quotation_id = d.quotation_id
      LEFT JOIN LATERAL (
        SELECT COUNT(di.id)::int AS item_count
        FROM public.installer_dispatch_items di
        WHERE di.dispatch_id = d.id
      ) item_stats ON TRUE
      ${whereSql}
      ORDER BY d.created_at DESC
    `,
    params
  );
  return result.rows;
}

export async function getDispatchById(id) {
  const dRes = await pool.query(
    `
      SELECT
        d.*,
        c.customer_name,
        c.phone AS customer_phone,
        NULL AS customer_address,
        u.email AS installer_email,
        q.quotation_number,
        o.order_number,
        o.token_number
      FROM public.installer_field_dispatches d
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.users u ON u.id = d.installer_id
      LEFT JOIN public.quotations q ON q.id = d.quotation_id
      LEFT JOIN public.crm_orders o ON o.quotation_id = d.quotation_id
      WHERE d.id = $1
    `,
    [id]
  );
  if (!dRes.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Dispatch not found.');

  const itemsRes = await pool.query(
    `
      SELECT
        di.*,
        p.product_name,
        p.product_type,
        ii.serial_number,
        ii.imei
      FROM public.installer_dispatch_items di
      LEFT JOIN public.products p ON p.id = di.product_id
      LEFT JOIN public.inventory_items ii ON ii.id = di.inventory_item_id
      WHERE di.dispatch_id = $1
    `,
    [id]
  );

  const purchasesRes = await pool.query(
    `SELECT * FROM public.installer_on_the_go_purchases WHERE dispatch_id = $1 ORDER BY purchased_at DESC`,
    [id]
  );

  return {
    ...dRes.rows[0],
    items: itemsRes.rows.map((item) => ({
      ...item,
      qr_payload: JSON.stringify({
        qr_token: item.qr_token,
        token_number: dRes.rows[0].token_number,
        dispatch_number: dRes.rows[0].dispatch_number,
        item: item.product_name,
        serial_number: item.serial_number || item.imei || null,
        quantity: Number(item.quantity_issued || 0),
      }),
    })),
    on_the_go_purchases: purchasesRes.rows,
  };
}

export async function listMaterialRequests(filters = {}) {
  const params = [];
  const where = [];
  if (filters.dispatch_id) {
    params.push(filters.dispatch_id);
    where.push(`mr.dispatch_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(String(filters.status).toUpperCase());
    where.push(`mr.status = $${params.length}`);
  }
  const result = await pool.query(
    `
      SELECT mr.*, d.dispatch_number, c.customer_name, p.product_name,
             requester.email AS requested_by_email, reviewer.email AS reviewed_by_email
      FROM public.field_material_requests mr
      JOIN public.installer_field_dispatches d ON d.id = mr.dispatch_id
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.products p ON p.id = mr.product_id
      LEFT JOIN public.users requester ON requester.id = mr.created_by
      LEFT JOIN public.users reviewer ON reviewer.id = mr.reviewed_by
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY mr.created_at DESC
    `,
    params,
  );
  return result.rows;
}

export async function createMaterialRequest(dispatchId, data, actorId = null) {
  const quantity = Number(data.requested_quantity || 0);
  const reason = String(data.reason || '').trim();
  if (quantity <= 0 || !reason) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Requested quantity and business reason are required.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dispatch = await client.query(
      `SELECT id FROM public.installer_field_dispatches WHERE id = $1 FOR UPDATE`,
      [dispatchId],
    );
    if (!dispatch.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Field assignment not found.');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, ['field-material-request-number']);
    const sequence = await client.query(
      `SELECT COALESCE(MAX(NULLIF(substring(request_number FROM 'MRQ-[0-9]{4}-([0-9]+)'), '')::int), 0) + 1 AS next_number FROM public.field_material_requests`,
    );
    const requestNumber = `MRQ-${new Date().getUTCFullYear()}-${String(sequence.rows[0].next_number).padStart(4, '0')}`;
    const result = await client.query(
      `
        INSERT INTO public.field_material_requests (
          request_number, dispatch_id, product_id, item_description,
          requested_quantity, reason, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        requestNumber,
        dispatchId,
        data.product_id || null,
        String(data.item_description || '').trim() || 'Additional field material',
        quantity,
        reason,
        actorId,
      ],
    );
    await client.query('COMMIT');
    publishInventoryEvent('workflow.changed', { reason: 'material_requested', material_request_id: result.rows[0].id, dispatch_id: dispatchId });
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function reviewMaterialRequest(id, data, actorId = null) {
  const status = String(data.status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Material request status must be APPROVED or REJECTED.');
  }
  const result = await pool.query(
    `
      UPDATE public.field_material_requests
      SET status = $2, review_note = $3, reviewed_by = $4,
          reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `,
    [id, status, String(data.review_note || '').trim() || null, actorId],
  );
  if (!result.rows[0]) throw new AppError(409, 'INVALID_REQUEST_STATUS', 'Only pending material requests can be reviewed.');
  publishInventoryEvent('workflow.changed', { reason: 'material_request_reviewed', material_request_id: id, status });
  return result.rows[0];
}

export async function issueMaterialRequest(id, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      `SELECT * FROM public.field_material_requests WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const request = requestResult.rows[0];
    if (!request) throw new AppError(404, 'NOT_FOUND', 'Material request not found.');
    if (request.status === 'ISSUED') {
      await client.query('COMMIT');
      return request;
    }
    if (request.status !== 'APPROVED' || !request.product_id) {
      throw new AppError(409, 'INVALID_REQUEST_STATUS', 'Approve the request and select a catalog product before issue.');
    }

    const productResult = await client.query(
      `SELECT id, product_name, quantity, selling_price, unit_price FROM public.products WHERE id = $1 FOR UPDATE`,
      [request.product_id],
    );
    const product = productResult.rows[0];
    const quantity = Number(request.requested_quantity || 0);
    if (!product || Number(product.quantity || 0) < quantity) {
      throw new AppError(400, 'INSUFFICIENT_STOCK', 'Requested additional material is not available in stock.');
    }

    await client.query(
      `
        INSERT INTO public.installer_dispatch_items (
          dispatch_id, product_id, quantity_issued, quantity_used,
          quantity_returned, unit_of_measure, unit_price, notes
        )
        VALUES ($1, $2, $3, 0, 0, 'UNITS', $4, $5)
      `,
      [request.dispatch_id, request.product_id, quantity, product.selling_price || product.unit_price || 0, `Issued against ${request.request_number}`],
    );
    const balance = await client.query(
      `UPDATE public.products SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1 RETURNING quantity`,
      [request.product_id, quantity],
    );
    await recordInventoryMovement(client, {
      product_id: request.product_id,
      movement_type: 'STOCK_OUT',
      quantity,
      reference_type: 'FIELD_MATERIAL_REQUEST',
      reference_id: request.id,
      notes: `Additional material issued against ${request.request_number}`,
      stock_balance_after: balance.rows[0]?.quantity,
      idempotency_key: `material-request:${request.id}:issue`,
      created_by: actorId,
    });
    const updated = await client.query(
      `UPDATE public.field_material_requests SET status = 'ISSUED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    await client.query('COMMIT');
    publishInventoryEvent('stock.changed', { reason: 'additional_material_issued', material_request_id: id, product_id: request.product_id, quantity });
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listReturnRequests(filters = {}) {
  const params = [];
  const where = [`d.status IN ('RETURN_PENDING', 'RETURN_CONFIRMED', 'RECONCILED', 'COMPLETED', 'BILL_SENT', 'NO_CHARGE')`];
  if (filters.status) {
    const status = String(filters.status).toUpperCase();
    if (status === 'PENDING') where.push(`d.status = 'RETURN_PENDING'`);
    if (status === 'CONFIRMED') where.push(`d.status IN ('RETURN_CONFIRMED', 'COMPLETED', 'RECONCILED')`);
    if (status === 'STOCK_UPDATED') where.push(`d.status = 'BILL_SENT'`);
    if (status === 'NO_CHARGE') where.push(`d.status = 'NO_CHARGE'`);
  }

  const result = await pool.query(
    `
      SELECT
        d.id,
        d.dispatch_number,
        d.quotation_id,
        d.customer_id,
        d.installer_id,
        d.status AS dispatch_status,
        d.dispatched_at,
        d.completed_at,
        d.created_at,
        d.updated_at,
        c.customer_name,
        COALESCE(NULLIF(ei.name, ''), u.email, 'Field technician') AS installer_name,
        u.email AS installer_email,
        q.quotation_number,
        o.order_number,
        o.token_number,
        COUNT(di.id) FILTER (WHERE COALESCE(di.quantity_returned, 0) > 0)::int AS item_count,
        COALESCE(SUM(di.quantity_issued), 0)::numeric AS total_issued_qty,
        COALESCE(SUM(di.quantity_returned), 0)::numeric AS total_returned_qty
      FROM public.installer_field_dispatches d
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.users u ON u.id = d.installer_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      LEFT JOIN public.quotations q ON q.id = d.quotation_id
      LEFT JOIN public.crm_orders o ON o.quotation_id = d.quotation_id
      LEFT JOIN public.installer_dispatch_items di ON di.dispatch_id = d.id
      WHERE ${where.join(' AND ')}
      GROUP BY d.id, c.customer_name, u.email, ei.name, q.quotation_number, o.order_number, o.token_number
      HAVING COALESCE(SUM(di.quantity_returned), 0) > 0
      ORDER BY d.updated_at DESC, d.created_at DESC
    `,
    params,
  );

  return result.rows.map((row) => ({
    ...row,
    return_request_no: returnRequestNumber(row.dispatch_number),
    status: mapReturnStatus(row.dispatch_status),
    items_to_return_count: Number(row.item_count || 0),
    submitted_date: row.completed_at || row.updated_at || row.created_at,
  }));
}

export async function getReturnRequestById(id) {
  const dispatch = await getDispatchById(id);
  const items = (dispatch.items || []).map((item) => {
    const issued = toAmount(item.quantity_issued);
    const returned = toAmount(item.quantity_returned, Math.max(0, issued - toAmount(item.quantity_used)));
    const unitPrice = toAmount(item.unit_price);
    return {
      ...item,
      quantity_returned: returned,
      condition: 'GOOD',
      confirm: false,
      line_issued_amount: issued * unitPrice,
      line_return_amount: returned * unitPrice,
    };
  });
  return {
    ...dispatch,
    dispatch_status: String(dispatch.status || '').toUpperCase(),
    return_request_no: returnRequestNumber(dispatch.dispatch_number),
    status: mapReturnStatus(dispatch.status),
    items,
    bill_adjustment: buildBillAdjustment({ ...dispatch, items }),
    no_charge: String(dispatch.status || '').toUpperCase() === 'NO_CHARGE',
  };
}

export async function confirmReturnRequest(id, { items = [], notes }, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dispatchRes = await client.query(
      `SELECT * FROM public.installer_field_dispatches WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const dispatch = dispatchRes.rows[0];
    if (!dispatch) throw new AppError(404, 'NOT_FOUND', 'Return request not found.');
    if (['RETURN_CONFIRMED', 'BILL_SENT'].includes(String(dispatch.status || '').toUpperCase())) {
      await client.query('COMMIT');
      return getReturnRequestById(id);
    }
    if (String(dispatch.status || '').toUpperCase() !== 'RETURN_PENDING') {
      throw new AppError(409, 'INVALID_RETURN_STATUS', 'Installer must submit the return request before Inventory can confirm it.');
    }

    const returnSummary = await client.query(
      `
        SELECT COALESCE(SUM(quantity_returned), 0)::numeric AS returned_quantity
        FROM public.installer_dispatch_items
        WHERE dispatch_id = $1
      `,
      [id],
    );
    const hasPhysicalReturns = toAmount(returnSummary.rows[0]?.returned_quantity) > 0;
    if (hasPhysicalReturns && (!Array.isArray(items) || !items.some((item) => item.confirmed || item.confirm))) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Confirm at least one returned item.');
    }

    for (const item of items) {
      if (!item.confirmed && !item.confirm) continue;
      const qReturned = Math.max(0, toAmount(item.quantity_returned));
      const condition = String(item.condition || 'GOOD').toUpperCase();

      const itemRes = await client.query(
        `
          SELECT di.*, p.product_name
          FROM public.installer_dispatch_items di
          LEFT JOIN public.products p ON p.id = di.product_id
          WHERE di.id = $1 AND di.dispatch_id = $2
          FOR UPDATE OF di
        `,
        [item.id, id],
      );
      const current = itemRes.rows[0];
      if (!current) continue;

      const issued = toAmount(current.quantity_issued);
      if (qReturned > issued) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Returned quantity cannot exceed the issued quantity.');
      }
      const unitPrice = toAmount(current.unit_price);
      const quantityUsed = condition === 'CONSUMABLE_USED'
        ? issued
        : Math.max(0, issued - qReturned);

      await client.query(
        `
          UPDATE public.installer_dispatch_items
          SET quantity_used = $2,
              quantity_returned = $3,
              total_used_price = $4,
              notes = $5
          WHERE id = $1
        `,
        [
          current.id,
          quantityUsed,
          condition === 'CONSUMABLE_USED' ? 0 : qReturned,
          quantityUsed * unitPrice,
          `${conditionLabel(condition)} return confirmed${item.notes ? ` - ${item.notes}` : ''}`,
        ],
      );

      if (current.inventory_item_id) {
        const serialStatus = condition === 'GOOD' ? 'AVAILABLE' : condition === 'DAMAGED' ? 'DAMAGED' : 'INSTALLED';
        const itemUpdate = await client.query(
          `UPDATE public.inventory_items SET current_status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [current.inventory_item_id, serialStatus],
        );
        const inventoryItem = itemUpdate.rows[0];
        if (inventoryItem) {
          if (condition === 'GOOD' && qReturned > 0) {
            await client.query(
              `UPDATE public.products SET quantity = quantity + $2, updated_at = NOW() WHERE id = $1`,
              [inventoryItem.product_id, Math.round(qReturned)],
            );
          }
          await recordInventoryMovement(client, {
            product_id: inventoryItem.product_id,
            inventory_item_id: inventoryItem.id,
            movement_type: condition === 'CONSUMABLE_USED' ? 'STOCK_OUT' : 'RETURN',
            quantity: condition === 'CONSUMABLE_USED' ? quantityUsed : qReturned,
            reference_type: 'RETURN_CONFIRMATION',
            reference_id: id,
            notes: `${conditionLabel(condition)} return confirmed for ${dispatch.dispatch_number}`,
            created_by: actorId,
          });
        }
      } else if (current.product_id) {
        if (condition === 'GOOD' && qReturned > 0) {
          await client.query(
            `UPDATE public.products SET quantity = quantity + $2, updated_at = NOW() WHERE id = $1`,
            [current.product_id, Math.round(qReturned)],
          );
        }
        await recordInventoryMovement(client, {
          product_id: current.product_id,
          movement_type: condition === 'CONSUMABLE_USED' ? 'STOCK_OUT' : 'RETURN',
          quantity: condition === 'CONSUMABLE_USED' ? quantityUsed : qReturned,
          reference_type: 'RETURN_CONFIRMATION',
          reference_id: id,
          notes: `${conditionLabel(condition)} return confirmed for ${dispatch.dispatch_number}`,
          created_by: actorId,
        });
      }
    }

    const updated = await client.query(
      `
        UPDATE public.installer_field_dispatches
        SET status = 'RETURN_CONFIRMED',
            completed_at = COALESCE(completed_at, NOW()),
            notes = COALESCE($2, notes),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, notes || 'Inventory confirmed the material reconciliation.'],
    );

    if (dispatch.quotation_id) {
      await client.query(
        `
          UPDATE public.crm_orders
          SET status = 'COMPLETED',
              updated_at = NOW()
          WHERE quotation_id = $1
            AND status NOT IN ('BILL_SENT', 'INVOICED', 'BILL_REJECTED', 'CANCELLED')
        `,
        [dispatch.quotation_id],
      );
    }

    await client.query('COMMIT');
    publishInventoryEvent('stock.changed', {
      reason: 'return_confirmed',
      dispatch_id: id,
    });
    return getReturnRequestById(updated.rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function sendAdjustedBillToFinance(id, actorId = null) {
  const dispatch = await getDispatchById(id);
  if (!dispatch) throw new AppError(404, 'NOT_FOUND', 'Return request not found.');
  if (String(dispatch.status).toUpperCase() === 'NO_CHARGE') {
    const request = await getReturnRequestById(id);
    return {
      ...request,
      no_charge: true,
      finance_handoff_status: 'NOT_REQUIRED',
      message: 'No invoice was generated because every chargeable item was returned.',
    };
  }
  if (String(dispatch.status).toUpperCase() === 'BILL_SENT') {
    return getReturnRequestById(id);
  }
  if (!['RETURN_CONFIRMED', 'COMPLETED', 'RECONCILED'].includes(String(dispatch.status || '').toUpperCase())) {
    throw new AppError(409, 'RECONCILIATION_NOT_CONFIRMED', 'Confirm the material reconciliation before submitting the verified billing record to Finance.');
  }
  if (!dispatch.customer_id) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dispatch client is required before sending bill to finance.');
  }

  const billAdjustment = buildBillAdjustment(dispatch);
  if (billAdjustment.final_adjusted_total <= 0) {
    await pool.query(
      `
        UPDATE public.installer_field_dispatches
        SET status = 'NO_CHARGE',
            notes = CONCAT_WS(E'\n', NULLIF(notes, ''), 'No charge: every chargeable item was returned; Finance invoice not required.'),
            updated_at = NOW()
        WHERE id = $1
      `,
      [id],
    );

    if (dispatch.quotation_id) {
      await pool.query(
        `
          UPDATE public.crm_orders
          SET status = 'COMPLETED',
              updated_at = NOW()
          WHERE quotation_id = $1
            AND status NOT IN ('INVOICED', 'CANCELLED')
        `,
        [dispatch.quotation_id],
      );
    }

    const request = await getReturnRequestById(id);
    return {
      ...request,
      no_charge: true,
      finance_handoff_status: 'NOT_REQUIRED',
      message: 'No invoice was generated because every chargeable item was returned.',
    };
  }

  const invoice = await createClientInvoiceFromDispatch({
    dispatch_id: id,
    quotation_id: dispatch.quotation_id || null,
    customer_id: dispatch.customer_id,
    template_name: 'Adjusted Installer Bill',
    tax_type: 'GST',
    tax_rate: 18,
    number_of_copies: 4,
    status: 'DRAFT',
    notes: JSON.stringify({
      source: 'installer_returns',
      dispatch_number: dispatch.dispatch_number,
      prepared_by: actorId,
    }),
    idempotency_key: `adjusted-bill-${id}`,
  });

  await pool.query(
    `
      UPDATE public.installer_field_dispatches
      SET status = 'BILL_SENT',
          updated_at = NOW()
      WHERE id = $1
    `,
    [id],
  );

  if (dispatch.quotation_id) {
    await pool.query(
      `
        UPDATE public.crm_orders
        SET status = 'BILL_SENT',
            updated_at = NOW()
        WHERE quotation_id = $1
          AND status NOT IN ('INVOICED', 'CANCELLED')
      `,
      [dispatch.quotation_id],
    );
  }

  const request = await getReturnRequestById(id);
  return { ...request, invoice };
}

export async function reconcileDispatch(
  id,
  { items = [], on_the_go_purchases = [], notes, client_signoff_name, client_signoff_note },
  actorId = null,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dispatchRes = await client.query(
      `SELECT * FROM public.installer_field_dispatches WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const dispatch = dispatchRes.rows[0];
    if (!dispatch) throw new AppError(404, 'NOT_FOUND', 'Field service assignment not found.');
    if (['RETURN_PENDING', 'RETURN_CONFIRMED', 'BILL_SENT'].includes(String(dispatch.status || '').toUpperCase())) {
      await client.query('COMMIT');
      return dispatch;
    }

    const signoffName = String(client_signoff_name || '').trim();
    if (!signoffName) {
      throw new AppError(400, 'CLIENT_SIGNOFF_REQUIRED', 'Client sign-off name is required before completing the job.');
    }

    let totalReturnedForJob = 0;
    for (const item of items) {
      const currentItemResult = await client.query(
        `
          SELECT *
          FROM public.installer_dispatch_items
          WHERE id = $1 AND dispatch_id = $2
          FOR UPDATE
        `,
        [item.id, id],
      );
      const currentItem = currentItemResult.rows[0];
      if (!currentItem) {
        throw new AppError(404, 'NOT_FOUND', 'Dispatch item not found.');
      }

      const qUsed = Number(item.quantity_used || 0);
      const qReturned = Number(item.quantity_returned || 0);
      totalReturnedForJob += qReturned;
      const unitPrice = Number(currentItem.unit_price || 0);
      const totalUsedPrice = qUsed * unitPrice;

      if (qUsed < 0 || qReturned < 0 || qUsed + qReturned > Number(currentItem.quantity_issued || 0)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Used and returned quantities must not exceed the issued quantity.');
      }

      await client.query(
        `
          UPDATE public.installer_dispatch_items
          SET quantity_used = $2,
              quantity_returned = $3,
              total_used_price = $4,
              notes = $5
          WHERE id = $1
        `,
        [item.id, qUsed, qReturned, totalUsedPrice, item.notes || null]
      );

      // Reconcile Serialized Items status
      if (currentItem.inventory_item_id) {
        if (qUsed > 0) {
          const itemRes = await client.query(
            `UPDATE public.inventory_items SET current_status = 'INSTALLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [currentItem.inventory_item_id]
          );
          const inventoryItem = itemRes.rows[0];
          if (inventoryItem) {
            await recordInventoryMovement(client, {
              product_id: inventoryItem.product_id,
              inventory_item_id: inventoryItem.id,
              movement_type: 'STOCK_OUT',
              quantity: qUsed,
              reference_type: 'FIELD_RECONCILIATION',
              reference_id: id,
              notes: item.notes || 'Installer marked item used/installed',
              created_by: actorId,
            });
          }
        } else if (qReturned > 0) {
          const itemRes = await client.query(
            `UPDATE public.inventory_items SET current_status = 'RETURNED', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [currentItem.inventory_item_id]
          );
          const inventoryItem = itemRes.rows[0];
          if (inventoryItem) {
            await recordInventoryMovement(client, {
              product_id: inventoryItem.product_id,
              inventory_item_id: inventoryItem.id,
              movement_type: 'RETURN',
              quantity: qReturned,
              reference_type: 'FIELD_RECONCILIATION',
              reference_id: id,
              notes: item.notes || 'Installer returned unused serial item',
              created_by: actorId,
            });
          }
        }
      }

      // Returned non-serial stock remains pending until Inventory confirms its condition.
    }

    // Save On-The-Go Field Purchases
    for (const pur of on_the_go_purchases) {
      if (pur.item_description && pur.amount) {
        await client.query(
          `
            INSERT INTO public.installer_on_the_go_purchases (dispatch_id, item_description, vendor_name, amount, receipt_url, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [id, pur.item_description, pur.vendor_name || null, pur.amount, pur.receipt_url || null, pur.notes || null]
        );
      }
    }

    const nextStatus = totalReturnedForJob > 0 ? 'RETURN_PENDING' : 'RETURN_CONFIRMED';

    // Jobs with no physical returns do not need a second Inventory return review.
    const dRes = await client.query(
      `
        UPDATE public.installer_field_dispatches
        SET status = $3,
            completed_at = NOW(),
            notes = COALESCE($2, notes),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, notes || null, nextStatus]
    );

    if (dispatch.quotation_id) {
      await client.query(
        `
          UPDATE public.crm_orders
          SET technical_status = 'COMPLETED',
              client_signoff_status = 'SIGNED',
              client_signoff_at = NOW(),
              client_signoff_name = $2,
              client_signoff_note = $3,
              updated_at = NOW()
          WHERE quotation_id = $1
        `,
        [dispatch.quotation_id, signoffName, String(client_signoff_note || '').trim() || null],
      );
      await client.query(
        `
          UPDATE public.quotations
          SET client_signoff_at = NOW(),
              client_signoff_name = $2,
              client_signoff_note = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [dispatch.quotation_id, signoffName, String(client_signoff_note || '').trim() || null],
      );
    }

    await client.query('COMMIT');
    publishInventoryEvent('workflow.changed', {
      reason: nextStatus === 'RETURN_PENDING' ? 'field_return_submitted' : 'field_service_completed',
      dispatch_id: id,
    });
    if (nextStatus === 'RETURN_CONFIRMED') {
      return sendAdjustedBillToFinance(id, actorId);
    }
    return dRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
