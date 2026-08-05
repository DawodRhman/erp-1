import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { recordInventoryMovement } from './inventory.service.js';

export async function createDispatch(data, actorId = null) {
  // data: { quotation_id, customer_id, installer_id, site_address, notes, items: [{ product_id, inventory_item_id, quantity_issued, unit_of_measure, unit_price }] }
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM public.installer_field_dispatches`);
  const seq = (countRes.rows[0].total || 0) + 1;
  const dispatchNum = `DSP-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(seq).padStart(4, '0')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
        data.installer_id || null,
        data.site_address || null,
        data.notes || null,
      ]
    );
    const dispatch = dRes.rows[0];

    const items = data.items || [];
    for (const item of items) {
      await client.query(
        `
          INSERT INTO public.installer_dispatch_items (
            dispatch_id, product_id, inventory_item_id, quantity_issued, quantity_used, quantity_returned, unit_of_measure, unit_price
          )
          VALUES ($1, $2, $3, $4, 0, 0, $5, $6)
        `,
        [
          dispatch.id,
          item.product_id || null,
          item.inventory_item_id || null,
          item.quantity_issued || 1,
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
            quantity: item.quantity_issued || 1,
            reference_type: 'FIELD_DISPATCH',
            reference_id: dispatch.id,
            notes: `Issued to installer from dispatch ${dispatch.dispatch_number}`,
            created_by: actorId,
          });
        }
      } else if (item.product_id) {
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          movement_type: 'STOCK_OUT',
          quantity: item.quantity_issued || 1,
          reference_type: 'FIELD_DISPATCH',
          reference_id: dispatch.id,
          notes: `Issued to installer from dispatch ${dispatch.dispatch_number}`,
          created_by: actorId,
        });
      }
    }

    // Update quotation status if linked
    if (data.quotation_id) {
      await client.query(`UPDATE public.quotations SET status = 'IN_PROGRESS' WHERE id = $1`, [data.quotation_id]);
    }

    await client.query('COMMIT');
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
        u.email AS installer_email,
        q.quotation_number
      FROM public.installer_field_dispatches d
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.users u ON u.id = d.installer_id
      LEFT JOIN public.quotations q ON q.id = d.quotation_id
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
        q.quotation_number
      FROM public.installer_field_dispatches d
      LEFT JOIN public.customers c ON c.id = d.customer_id
      LEFT JOIN public.users u ON u.id = d.installer_id
      LEFT JOIN public.quotations q ON q.id = d.quotation_id
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
    items: itemsRes.rows,
    on_the_go_purchases: purchasesRes.rows,
  };
}

export async function reconcileDispatch(id, { items = [], on_the_go_purchases = [], notes }, actorId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const qUsed = Number(item.quantity_used || 0);
      const qReturned = Number(item.quantity_returned || 0);
      const unitPrice = Number(item.unit_price || 0);
      const totalUsedPrice = qUsed * unitPrice;

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
      if (item.inventory_item_id) {
        if (qUsed > 0) {
          const itemRes = await client.query(
            `UPDATE public.inventory_items SET current_status = 'INSTALLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [item.inventory_item_id]
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
            `UPDATE public.inventory_items SET current_status = 'AVAILABLE', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [item.inventory_item_id]
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

      // Reconcile Consumables: Return unused feet/meters/units to main warehouse product stock
      if (item.product_id && qReturned > 0) {
        await client.query(
          `UPDATE public.products SET quantity = quantity + $2, updated_at = NOW() WHERE id = $1`,
          [item.product_id, Math.round(qReturned)]
        );
        await recordInventoryMovement(client, {
          product_id: item.product_id,
          movement_type: 'RETURN',
          quantity: Math.round(qReturned),
          reference_type: 'FIELD_RECONCILIATION',
          reference_id: id,
          notes: item.notes || 'Installer returned unused non-serial stock',
          created_by: actorId,
        });
      }
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

    // Update Dispatch Status
    const dRes = await client.query(
      `
        UPDATE public.installer_field_dispatches
        SET status = 'COMPLETED',
            completed_at = NOW(),
            notes = COALESCE($2, notes),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, notes || null]
    );

    await client.query('COMMIT');
    return dRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
