import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

// Phase 1: Sales & CRM
export async function getSalesLeads() {
  const result = await pool.query(`
    SELECT sl.*, c.customer_name, u.email AS assigned_rep_email
    FROM public.sales_leads sl
    LEFT JOIN public.customers c ON c.id = sl.customer_id
    LEFT JOIN public.users u ON u.id = sl.assigned_sales_rep
    ORDER BY sl.created_at DESC
  `);
  return result.rows;
}

export async function createSalesLead({ title, customer_id, estimated_value = 0, assigned_sales_rep, status = 'NEW' }) {
  if (!title || !title.trim()) throw new AppError('VALIDATION_ERROR', 'Lead title is required.', 400);
  const leadNo = `LEAD-${Date.now().toString().slice(-6)}`;
  const result = await pool.query(
    `INSERT INTO public.sales_leads (lead_number, title, customer_id, estimated_value, assigned_sales_rep, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [leadNo, title.trim(), customer_id || null, parseFloat(estimated_value) || 0, assigned_sales_rep || null, status]
  );
  return result.rows[0];
}

export async function getQuotations() {
  const result = await pool.query(`
    SELECT sq.*, c.customer_name, sl.title AS lead_title
    FROM public.sales_quotations sq
    LEFT JOIN public.customers c ON c.id = sq.customer_id
    LEFT JOIN public.sales_leads sl ON sl.id = sq.lead_id
    ORDER BY sq.created_at DESC
  `);
  return result.rows;
}

export async function createQuotation({ lead_id, customer_id, quotation_type = 'PRODUCT', items = [], created_by }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteNo = `QT-${Date.now().toString().slice(-6)}`;
    let total = 0;
    items.forEach((item) => {
      total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 1);
    });

    const quoteRes = await client.query(
      `INSERT INTO public.sales_quotations (quotation_number, lead_id, customer_id, quotation_type, total_amount, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6) RETURNING *`,
      [quoteNo, lead_id || null, customer_id || null, quotation_type, total, created_by || null]
    );
    const quotation = quoteRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(item.unit_price) || 0);
      await client.query(
        `INSERT INTO public.quotation_items (quotation_id, product_id, item_description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [quotation.id, item.product_id || null, item.item_description || null, q, p, q * p]
      );
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

// Project Activation (Quotation WON -> Unique project_id)
export async function activateProjectFromQuotation(quotation_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteRes = await client.query(`SELECT * FROM public.sales_quotations WHERE id = $1`, [quotation_id]);
    if (quoteRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Quotation not found.', 404);
    const quotation = quoteRes.rows[0];

    // Mark quotation as WON
    await client.query(`UPDATE public.sales_quotations SET status = 'WON' WHERE id = $1`, [quotation_id]);
    if (quotation.lead_id) {
      await client.query(`UPDATE public.sales_leads SET status = 'WON' WHERE id = $1`, [quotation.lead_id]);
    }

    // Auto-generate project number
    const projectNo = `PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const projectRes = await client.query(
      `INSERT INTO public.erp_projects (project_number, project_name, quotation_id, customer_id, status, budget)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5) RETURNING *`,
      [projectNo, `Project ${projectNo} for Quote ${quotation.quotation_number}`, quotation.id, quotation.customer_id, quotation.total_amount]
    );

    await client.query('COMMIT');
    return projectRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getProjects() {
  const result = await pool.query(`
    SELECT p.*, c.customer_name, COUNT(pra.id)::int AS assigned_team_count
    FROM public.erp_projects p
    LEFT JOIN public.customers c ON c.id = p.customer_id
    LEFT JOIN public.project_resource_assignments pra ON pra.project_id = p.id
    GROUP BY p.id, c.customer_name
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

export async function assignProjectResource({ project_id, employee_id, role_in_project = 'Member' }) {
  const result = await pool.query(
    `INSERT INTO public.project_resource_assignments (project_id, employee_id, role_in_project)
     VALUES ($1, $2, $3) RETURNING *`,
    [project_id, employee_id, role_in_project]
  );
  return result.rows[0];
}

// Phase 2: Operations Purchase Requisitions (PR)
export async function getPurchaseRequisitions() {
  const result = await pool.query(`
    SELECT pr.*, p.project_name, u.email AS requested_by_email
    FROM public.purchase_requisitions pr
    LEFT JOIN public.erp_projects p ON p.id = pr.project_id
    LEFT JOIN public.users u ON u.id = pr.requested_by
    ORDER BY pr.created_at DESC
  `);
  return result.rows;
}

export async function createPurchaseRequisition({ project_id, pr_type = 'CLIENT_INVENTORY', items = [], requested_by, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prNo = `PR-${Date.now().toString().slice(-6)}`;
    const prRes = await client.query(
      `INSERT INTO public.purchase_requisitions (pr_number, project_id, pr_type, requested_by, status, notes)
       VALUES ($1, $2, $3, $4, 'SUBMITTED', $5) RETURNING *`,
      [prNo, project_id || null, pr_type, requested_by || null, notes?.trim() || null]
    );
    const pr = prRes.rows[0];

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);
      const est = Math.max(0, parseFloat(item.estimated_cost) || 0);
      await client.query(
        `INSERT INTO public.purchase_requisition_items (pr_id, product_id, quantity, estimated_cost, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [pr.id, item.product_id || null, q, est, item.remarks || null]
      );
    }

    await client.query('COMMIT');
    return pr;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Phase 3: Stock Out Cases
export async function stockOutToEmployee({ employee_id, product_id, inventory_item_id, asset_type = 'LAPTOP' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assetNo = `AST-${Date.now().toString().slice(-6)}`;
    const assetRes = await client.query(
      `INSERT INTO public.employee_assets (asset_number, employee_id, product_id, inventory_item_id, asset_type, status)
       VALUES ($1, $2, $3, $4, $5, 'ASSIGNED') RETURNING *`,
      [assetNo, employee_id, product_id || null, inventory_item_id || null, asset_type]
    );

    if (inventory_item_id) {
      await client.query(`UPDATE public.inventory_items SET current_status = 'ALLOCATED' WHERE id = $1`, [inventory_item_id]);
    }
    if (product_id) {
      await client.query(`UPDATE public.products SET quantity = GREATEST(0, quantity - 1) WHERE id = $1`, [product_id]);
    }

    await client.query('COMMIT');
    return assetRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Phase 4: Field Service Tickets & Digital OTP Handshake
export async function getServiceTickets() {
  const result = await pool.query(`
    SELECT st.*, c.customer_name, p.project_name, u.email AS technician_email
    FROM public.service_tickets st
    LEFT JOIN public.customers c ON c.id = st.customer_id
    LEFT JOIN public.erp_projects p ON p.id = st.project_id
    LEFT JOIN public.users u ON u.id = st.assigned_technician_id
    ORDER BY st.created_at DESC
  `);
  return result.rows;
}

export async function createServiceTicket({ customer_id, project_id, complaint_type = 'DEVICE_OFFLINE', description, assigned_technician_id }) {
  if (!customer_id) throw new AppError('VALIDATION_ERROR', 'Customer is required.', 400);
  const ticketNo = `TCK-${Date.now().toString().slice(-6)}`;
  const result = await pool.query(
    `INSERT INTO public.service_tickets (ticket_number, customer_id, project_id, complaint_type, status, description, assigned_technician_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [ticketNo, customer_id, project_id || null, complaint_type, assigned_technician_id ? 'ASSIGNED' : 'OPEN', description?.trim() || null, assigned_technician_id || null]
  );
  return result.rows[0];
}

export async function triggerTechnicianCompletionOTP(ticket_id) {
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const result = await pool.query(
    `UPDATE public.service_tickets
     SET otp_code = $1, status = 'OTP_PENDING'
     WHERE id = $2
     RETURNING *`,
    [otpCode, ticket_id]
  );
  if (result.rows.length === 0) throw new AppError('NOT_FOUND', 'Ticket not found.', 404);
  return { ticket: result.rows[0], otp_sent_to_customer: otpCode };
}

export async function verifyCustomerOTPHandshake({ ticket_id, input_otp, photo_proof_url, customer_signature }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ticketRes = await client.query(`SELECT * FROM public.service_tickets WHERE id = $1`, [ticket_id]);
    if (ticketRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Ticket not found.', 404);
    const ticket = ticketRes.rows[0];

    if ((ticket.otp_code || '').trim() !== (input_otp || '').trim()) {
      throw new AppError('INVALID_OTP', 'The entered 4-digit OTP code does not match customer verification.', 400);
    }

    const updatedRes = await client.query(
      `UPDATE public.service_tickets
       SET otp_verified = TRUE,
           status = 'CLOSED',
           photo_proof_url = $1,
           customer_signature = $2,
           closed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [photo_proof_url || null, customer_signature || null, ticket_id]
    );

    // Trigger Technician Visit Fee Incentive (e.g., PKR 1,500)
    if (ticket.assigned_technician_id) {
      await client.query(
        `INSERT INTO public.technician_visit_fees (technician_id, ticket_id, visit_fee_amount, status)
         VALUES ($1, $2, 1500.00, 'APPROVED')`,
        [ticket.assigned_technician_id, ticket_id]
      );
    }

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Phase 5: Virtual Cash Debt & Reconciliation
export async function recordTechnicianCashCollection({ ticket_id, technician_id, amount_collected }) {
  const debtNo = `VDBT-${Date.now().toString().slice(-6)}`;
  const result = await pool.query(
    `INSERT INTO public.technician_virtual_debts (debt_number, technician_id, ticket_id, amount_collected, status)
     VALUES ($1, $2, $3, $4, 'UNRECONCILED') RETURNING *`,
    [debtNo, technician_id, ticket_id || null, parseFloat(amount_collected) || 0]
  );
  return result.rows[0];
}

export async function getVirtualDebts() {
  const result = await pool.query(`
    SELECT vd.*, u.email AS technician_email, st.ticket_number
    FROM public.technician_virtual_debts vd
    JOIN public.users u ON u.id = vd.technician_id
    LEFT JOIN public.service_tickets st ON st.id = vd.ticket_id
    ORDER BY vd.collected_at DESC
  `);
  return result.rows;
}

export async function reconcileVirtualDebt(debt_id, reconciled_by) {
  const result = await pool.query(
    `UPDATE public.technician_virtual_debts
     SET status = 'RECONCILED', reconciled_at = NOW(), reconciled_by = $1
     WHERE id = $2 RETURNING *`,
    [reconciled_by || null, debt_id]
  );
  if (result.rows.length === 0) throw new AppError('NOT_FOUND', 'Virtual debt record not found.', 404);
  return result.rows[0];
}

// Special Asset Logic: Resignation Recovery Checklist
export async function handleEmployeeResignationVehicleChecklist(employee_id) {
  const result = await pool.query(
    `UPDATE public.employee_assets
     SET status = 'PENDING_RETURN'
     WHERE employee_id = $1 AND asset_type = 'VEHICLE' AND status = 'ASSIGNED'
     RETURNING *`,
    [employee_id]
  );
  return result.rows;
}
