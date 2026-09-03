import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { getDashboardPeriodRange, isWithinDashboardPeriod } from '../../utils/dashboardPeriod.js';

export const COMPANY_DETAILS = {
  name: 'Electronic Safety & Security PVT LTD',
  address: 'Suit no 201, 2nd floor Kawish Crown, DAECHS Shahrah e Faisal, Karachi',
  telephone: '021-34330896',
  ntn: '3628486-6',
  stRegistrationNo: '1400362848614',
  accountTitle: 'Electronic Safety & Security PVT LTD',
  accountNo: '2443-80000-16603',
  compactAccountNo: '24438000016603',
  bank: 'Habib Bank Limited, Shahrah e Faisal Br 2443',
};

export const HBL_BUYER_DETAILS = {
  name: 'Habib Bank Limited',
  address: '06-Habib Bank Plaza I I Chundrigar Road Karachi Pakistan',
  telephone: '92-21-32463238',
  ntn: '0698187-9',
  stRegistrationNo: '1700981301655',
};

export const EXPENSE_TYPES = {
  operational_expenses: {
    key: 'operational_expenses',
    label: 'Operational Expenses',
    natureOfWork: 'Services / Maintenance',
    defaultInvoiceFormat: 'hbl_single',
  },
  capital_expenses: {
    key: 'capital_expenses',
    label: 'Capital Expenses',
    natureOfWork: 'Supply / Installation',
    defaultInvoiceFormat: 'hbl_single',
  },
  complex_expenses: {
    key: 'complex_expenses',
    label: 'Complex Expenses',
    natureOfWork: 'Supply & Installation',
    defaultInvoiceFormat: 'hbl_single',
  },
  rental_expenses: {
    key: 'rental_expenses',
    label: 'Rental Expenses',
    natureOfWork: 'Rental / Lease',
    defaultInvoiceFormat: 'hbl_summary',
  },
  footage_expenses: {
    key: 'footage_expenses',
    label: 'Footage Expenses',
    natureOfWork: 'CCTV Footage Retrieval',
    defaultInvoiceFormat: 'hbl_footage',
  },
};

const VALID_EXPENSE_TYPES = new Set(Object.keys(EXPENSE_TYPES));

function toAmount(value, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function todayIso() {
  return new Date().toISOString();
}

function dateKey(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return String(value);
}

function numberToWords(num) {
  if (!num || Number.isNaN(Number(num))) return 'Zero Rupees Only';
  const n = Math.floor(Number(num));
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(value) {
    if (value < 20) return units[value];
    if (value < 100) return tens[Math.floor(value / 10)] + (value % 10 ? ` ${units[value % 10]}` : '');
    if (value < 1000) return `${units[Math.floor(value / 100)]} Hundred${value % 100 ? ` and ${inWords(value % 100)}` : ''}`;
    if (value < 100000) return `${inWords(Math.floor(value / 1000))} Thousand${value % 1000 ? ` ${inWords(value % 1000)}` : ''}`;
    if (value < 10000000) return `${inWords(Math.floor(value / 100000))} Lakh${value % 100000 ? ` ${inWords(value % 100000)}` : ''}`;
    return `${inWords(Math.floor(value / 10000000))} Crore${value % 10000000 ? ` ${inWords(value % 10000000)}` : ''}`;
  }

  return `${inWords(n)} Rupees Only`;
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
  await client.query(`CREATE SEQUENCE IF NOT EXISTS public.customer_invoice_number_seq`);
  const seqResult = await client.query(`SELECT nextval('public.customer_invoice_number_seq')::int AS seq`);
  return `INV-${new Date().getUTCFullYear()}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;
}

function parseNotes(notes) {
  if (!notes) return {};
  if (typeof notes === 'object') return notes;
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function normalizeExpenseType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (VALID_EXPENSE_TYPES.has(normalized)) return normalized;
  if (normalized === 'operational') return 'operational_expenses';
  if (normalized === 'capital') return 'capital_expenses';
  if (normalized === 'complex') return 'complex_expenses';
  if (normalized === 'rental') return 'rental_expenses';
  if (normalized === 'footage') return 'footage_expenses';
  return 'operational_expenses';
}

function normalizeInvoiceFormat(value, expenseType = 'operational_expenses') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'hbl_single_branch') return 'hbl_single';
  if (['hbl_summary', 'hbl_single', 'hbl_footage'].includes(normalized)) return normalized;
  return EXPENSE_TYPES[expenseType]?.defaultInvoiceFormat || 'hbl_single';
}

function mapApprovalStatus(invoice) {
  const notes = parseNotes(invoice.notes);
  const explicitStatus = String(notes.finance_approval_status || '').toUpperCase();
  if (explicitStatus === 'NO_CHARGE') return 'NO_CHARGE';
  if (explicitStatus === 'REJECTED') return 'REJECTED';
  if (String(invoice.status || '').toUpperCase() === 'ISSUED' || String(invoice.status || '').toUpperCase() === 'PAID') {
    return 'APPROVED';
  }
  if (String(invoice.status || '').toUpperCase() === 'CANCELLED' || String(invoice.status || '').toUpperCase() === 'VOIDED') {
    return 'REJECTED';
  }
  return 'PENDING';
}

function invoiceMeta(invoice) {
  const notes = parseNotes(invoice.notes);
  const expenseType = normalizeExpenseType(notes.expense_type || invoice.expense_type);
  const invoiceFormat = normalizeInvoiceFormat(notes.invoice_format, expenseType);
  return {
    ...notes,
    expense_type: expenseType,
    expense_label: EXPENSE_TYPES[expenseType]?.label || EXPENSE_TYPES.operational_expenses.label,
    invoice_format: invoiceFormat,
    ref_no: notes.ref_no || notes.purchase_order_no || notes.ticket_number || invoice.quotation_number || invoice.dispatch_number || '-',
    branch_name: notes.branch_name || notes.site_name || notes.customer_branch || '-',
    branch_code: notes.branch_code || notes.site_code || '-',
    region: notes.region || 'Karachi',
    po_number: notes.po_number || notes.purchase_order_no || notes.ticket_number || invoice.quotation_number || '-',
    work_description: notes.work_description || EXPENSE_TYPES[expenseType]?.natureOfWork || 'Services',
    fbr_invoice_no: notes.fbr_invoice_no || '-',
    footage_approval_date: notes.footage_approval_date || null,
    footage_retrieval_date: notes.footage_retrieval_date || null,
  };
}

function basicInvoiceShape(row, breakdown = null) {
  const meta = invoiceMeta(row);
  const approvalStatus = mapApprovalStatus(row);
  return {
    ...row,
    notes_json: meta,
    approval_status: approvalStatus,
    expense_type: meta.expense_type,
    expense_label: meta.expense_label,
    expense_type_label: meta.expense_label,
    invoice_format: meta.invoice_format,
    ref_no: meta.ref_no,
    branch_name: meta.branch_name,
    branch_code: meta.branch_code,
    region: meta.region,
    po_number: meta.po_number,
    work_description: meta.work_description,
    amount_excl_tax: toAmount(row.subtotal),
    sale_tax: toAmount(row.tax_amount),
    amount_incl_tax: toAmount(row.total_amount),
    original_amount: breakdown?.original_amount ?? toAmount(row.subtotal),
    returns_deducted: breakdown?.returns_deducted ?? 0,
    extra_added: breakdown?.extra_added ?? 0,
    final_amount: toAmount(row.total_amount),
  };
}

async function queryInvoices(whereSql = '', params = []) {
  const result = await pool.query(
    `
      SELECT
        i.*,
        c.customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        d.dispatch_number,
        d.status AS dispatch_status,
        d.completed_at AS dispatch_completed_at,
        d.updated_at AS dispatch_updated_at,
        q.quotation_number,
        o.order_number,
        o.token_number,
        o.status AS order_status
      FROM public.customer_invoices i
      LEFT JOIN public.customers c ON c.id = i.customer_id
      LEFT JOIN public.installer_field_dispatches d ON d.id = i.dispatch_id
      LEFT JOIN public.quotations q ON q.id = i.quotation_id
      LEFT JOIN public.crm_orders o ON o.quotation_id = i.quotation_id
      ${whereSql}
      ORDER BY i.created_at DESC, i.invoice_number DESC
    `,
    params,
  );
  return result.rows;
}

async function getInvoiceRow(id) {
  const rows = await queryInvoices(`WHERE i.id = $1`, [id]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Finance invoice was not found.');
  return rows[0];
}

async function getInvoiceItems(invoiceId) {
  const itemsRes = await pool.query(
    `
      SELECT
        ii.*,
        p.product_name,
        p.product_type
      FROM public.customer_invoice_items ii
      LEFT JOIN public.products p ON p.id = ii.product_id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id ASC
    `,
    [invoiceId],
  );
  return itemsRes.rows;
}

async function getBillBreakdown(invoice) {
  if (!invoice.dispatch_id) {
    const invoiceItems = await getInvoiceItems(invoice.id);
    const installed = invoiceItems.map((item) => ({
      id: item.id,
      product_name: item.product_name || item.description,
      description: item.description,
      quantity: toAmount(item.quantity, 1),
      unit_price: toAmount(item.unit_price),
      amount: toAmount(item.total_without_tax),
    }));
    return {
      installed_items: installed,
      returned_items: [],
      extra_items: [],
      original_amount: installed.reduce((sum, item) => sum + item.amount, 0),
      returns_deducted: 0,
      extra_added: 0,
      final_before_tax: toAmount(invoice.subtotal),
      tax_amount: toAmount(invoice.tax_amount),
      final_amount: toAmount(invoice.total_amount),
    };
  }

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
      ORDER BY di.id ASC
    `,
    [invoice.dispatch_id],
  );
  const extrasRes = await pool.query(
    `
      SELECT *
      FROM public.installer_on_the_go_purchases
      WHERE dispatch_id = $1
      ORDER BY purchased_at ASC, id ASC
    `,
    [invoice.dispatch_id],
  );

  const installedItems = [];
  const returnedItems = [];
  let originalAmount = 0;
  let returnsDeducted = 0;

  for (const item of itemsRes.rows) {
    const issued = toAmount(item.quantity_issued);
    const used = toAmount(item.quantity_used);
    const returned = toAmount(item.quantity_returned);
    const unitPrice = toAmount(item.unit_price);
    const productName = item.product_name || item.description || 'Stock item';
    originalAmount += issued * unitPrice;
    if (used > 0) {
      installedItems.push({
        id: item.id,
        product_name: productName,
        description: item.notes || productName,
        quantity: used,
        unit_price: unitPrice,
        amount: used * unitPrice,
        serial_number: item.serial_number,
        imei: item.imei,
      });
    }
    if (returned > 0) {
      returnedItems.push({
        id: item.id,
        product_name: productName,
        description: item.notes || productName,
        quantity: returned,
        unit_price: unitPrice,
        amount: returned * unitPrice,
      });
      returnsDeducted += returned * unitPrice;
    }
  }

  const extraItems = extrasRes.rows.map((item) => ({
    id: item.id,
    product_name: item.item_description,
    description: item.vendor_name || item.item_description,
    quantity: 1,
    unit_price: toAmount(item.amount),
    amount: toAmount(item.amount),
  }));
  const extraAdded = extraItems.reduce((sum, item) => sum + item.amount, 0);
  const finalBeforeTax = Math.max(0, originalAmount - returnsDeducted + extraAdded);

  return {
    installed_items: installedItems,
    returned_items: returnedItems,
    extra_items: extraItems,
    original_amount: originalAmount,
    returns_deducted: returnsDeducted,
    extra_added: extraAdded,
    final_before_tax: finalBeforeTax,
    tax_amount: toAmount(invoice.tax_amount),
    final_amount: toAmount(invoice.total_amount),
  };
}

export async function getFinanceDashboard(periodValue = 'monthly') {
  const invoices = await queryInvoices('');
  const range = getDashboardPeriodRange(periodValue);
  const shaped = invoices.map((invoice) => basicInvoiceShape(invoice));
  const periodInvoices = shaped.filter((invoice) => isWithinDashboardPeriod(invoice.invoice_date || invoice.created_at, range));
  const pendingApprovals = periodInvoices.filter((invoice) => invoice.approval_status === 'PENDING');
  const issuedInvoices = periodInvoices.filter((invoice) => ['ISSUED', 'PAID'].includes(String(invoice.status || '').toUpperCase()));
  const pendingPayments = periodInvoices.filter((invoice) => String(invoice.status || '').toUpperCase() === 'ISSUED');

  return {
    company: COMPANY_DETAILS,
    summary_period: range.period,
    period_start: range.start.toISOString(),
    period_end: range.end.toISOString(),
    stats: {
      pending_billing_approvals: pendingApprovals.length,
      invoices_in_period: issuedInvoices.length,
      revenue_in_period: issuedInvoices.reduce((sum, invoice) => sum + invoice.amount_incl_tax, 0),
      invoices_this_month: issuedInvoices.length,
      revenue_this_month: issuedInvoices.reduce((sum, invoice) => sum + invoice.amount_incl_tax, 0),
      pending_payments: pendingPayments.length,
    },
    pending_approvals: pendingApprovals.slice(0, 5),
    recent_invoices: periodInvoices
      .filter((invoice) => ['ISSUED', 'PAID', 'DRAFT'].includes(String(invoice.status || '').toUpperCase()))
      .slice(0, 5),
  };
}

export async function listBillingApprovals(filters = {}) {
  const rows = await queryInvoices('');
  const approvals = [];
  for (const row of rows) {
    const meta = parseNotes(row.notes);
    const source = String(meta.source || '').toLowerCase();
    const status = String(row.status || '').toUpperCase();
    if (source === 'finance_direct') continue;
    const shouldInclude =
      source === 'installer_returns' ||
      row.dispatch_id ||
      (row.quotation_id && ['DRAFT', 'ISSUED', 'CANCELLED', 'VOIDED'].includes(status));
    if (!shouldInclude) continue;
    const breakdown = await getBillBreakdown(row);
    const shaped = basicInvoiceShape(row, breakdown);
    if (filters.status && shaped.approval_status !== String(filters.status).toUpperCase()) continue;
    approvals.push({
      ...shaped,
      submitted_date: row.created_at,
      bill_breakdown: {
        installed_items: breakdown.installed_items,
        returned_items: breakdown.returned_items,
        extra_items: breakdown.extra_items,
        original_total: breakdown.original_amount,
        returns_deducted: breakdown.returns_deducted,
        extra_added: breakdown.extra_added,
        final_amount: breakdown.final_amount,
      },
    });
  }
  return approvals;
}

export async function getBillingApproval(id) {
  const invoice = await getInvoiceRow(id);
  const items = await getInvoiceItems(id);
  const breakdown = await getBillBreakdown(invoice);
  return {
    ...basicInvoiceShape(invoice, breakdown),
    company: COMPANY_DETAILS,
    buyer: HBL_BUYER_DETAILS,
    items,
    breakdown,
    submitted_date: invoice.created_at,
    bill_breakdown: {
      installed_items: breakdown.installed_items,
      returned_items: breakdown.returned_items,
      extra_items: breakdown.extra_items,
      original_total: breakdown.original_amount,
      returns_deducted: breakdown.returns_deducted,
      extra_added: breakdown.extra_added,
      final_amount: breakdown.final_amount,
    },
  };
}

export async function approveBillingApproval(id, data = {}, actor = {}) {
  const invoice = await getInvoiceRow(id);
  const breakdown = await getBillBreakdown(invoice);
  if (toAmount(breakdown.final_amount) <= 0) {
    throw new AppError(
      409,
      'ZERO_VALUE_INVOICE',
      'A zero-value adjustment cannot be issued as an invoice. Close it as no charge or correct the item usage first.',
    );
  }
  const currentStatus = String(invoice.status || '').toUpperCase();
  if (currentStatus === 'ISSUED' || currentStatus === 'PAID') {
    if (invoice.quotation_id) {
      await pool.query(
        `
          UPDATE public.crm_orders
          SET status = 'INVOICED',
              updated_at = NOW()
          WHERE quotation_id = $1
            AND status <> 'CANCELLED'
        `,
        [invoice.quotation_id],
      );
    }
    return getBillingApproval(id);
  }
  if (currentStatus === 'CANCELLED' || currentStatus === 'VOIDED') {
    throw new AppError(400, 'INVOICE_ALREADY_REJECTED', 'Rejected or voided bill cannot be approved.');
  }

  const expenseType = normalizeExpenseType(data.expense_type);
  const invoiceFormat = normalizeInvoiceFormat(data.invoice_format, expenseType);
  const notes = {
    ...parseNotes(invoice.notes),
    expense_type: expenseType,
    invoice_format: invoiceFormat,
    work_description: data.work_description || EXPENSE_TYPES[expenseType]?.natureOfWork,
    finance_approval_status: 'APPROVED',
    finance_approved_at: todayIso(),
    finance_approved_by: actor?.id || actor?.userId || null,
  };

  await pool.query(
    `
      UPDATE public.customer_invoices
      SET status = 'ISSUED',
          notes = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, JSON.stringify(notes)],
  );

  if (invoice.quotation_id) {
    await pool.query(
      `
        UPDATE public.crm_orders
        SET status = 'INVOICED',
            updated_at = NOW()
        WHERE quotation_id = $1
      `,
      [invoice.quotation_id],
    );
  }

  return getBillingApproval(id);
}

export async function rejectBillingApproval(id, data = {}, actor = {}) {
  const invoice = await getInvoiceRow(id);
  const currentStatus = String(invoice.status || '').toUpperCase();
  if (currentStatus === 'CANCELLED' || currentStatus === 'VOIDED') {
    return getBillingApproval(id);
  }
  if (currentStatus === 'ISSUED' || currentStatus === 'PAID') {
    throw new AppError(409, 'INVOICE_ALREADY_ISSUED', 'Issued or paid invoice cannot be rejected.');
  }
  const reason = String(data.reason || '').trim();
  if (!reason) throw new AppError(400, 'VALIDATION_ERROR', 'Rejection reason is required.');

  const notes = {
    ...parseNotes(invoice.notes),
    finance_approval_status: 'REJECTED',
    finance_rejected_at: todayIso(),
    finance_rejected_by: actor?.id || actor?.userId || null,
    finance_rejection_reason: reason,
  };

  await pool.query(
    `
      UPDATE public.customer_invoices
      SET status = 'CANCELLED',
          notes = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, JSON.stringify(notes)],
  );

  if (invoice.quotation_id) {
    await pool.query(
      `
        UPDATE public.crm_orders
        SET status = 'BILL_REJECTED',
            updated_at = NOW()
        WHERE quotation_id = $1
      `,
      [invoice.quotation_id],
    );
  }

  return getBillingApproval(id);
}

export async function listFinanceCustomers(filters = {}) {
  const search = String(filters.search || '').trim();
  const columns = await getPublicTableColumns('customers');
  const params = [];
  let whereSql = '';

  if (search) {
    params.push(`%${search}%`);
    const searchableColumns = ['customer_name', 'company_name', 'email', 'phone', 'address']
      .filter((column) => columns.has(column))
      .map((column) => `COALESCE(c.${column}, '') ILIKE $1`);
    if (searchableColumns.length) whereSql = `WHERE ${searchableColumns.join(' OR ')}`;
  }

  const customerNameSql = columns.has('customer_name')
    ? 'c.customer_name'
    : columns.has('company_name')
      ? 'c.company_name AS customer_name'
      : "COALESCE(c.email, c.id::text) AS customer_name";
  const companyNameSql = columns.has('company_name') ? 'c.company_name' : 'NULL::text AS company_name';
  const emailSql = columns.has('email') ? 'c.email' : 'NULL::text AS email';
  const phoneSql = columns.has('phone') ? 'c.phone' : 'NULL::text AS phone';
  const addressSql = columns.has('address') ? 'c.address' : 'NULL::text AS address';
  const orderBySql = columns.has('customer_name')
    ? 'c.customer_name'
    : columns.has('company_name')
      ? 'c.company_name'
      : 'c.id';

  const result = await pool.query(
    `
      SELECT
        c.id,
        ${customerNameSql},
        ${companyNameSql},
        ${emailSql},
        ${phoneSql},
        ${addressSql}
      FROM public.customers c
      ${whereSql}
      ORDER BY ${orderBySql} ASC
      LIMIT 250
    `,
    params,
  );

  return result.rows;
}

function normalizeDirectItems(data, expenseType) {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (!rawItems.length) throw new AppError(400, 'VALIDATION_ERROR', 'At least one invoice row is required.');
  if (rawItems.length > 20) throw new AppError(400, 'VALIDATION_ERROR', 'A maximum of 20 invoice rows is allowed.');

  return rawItems.map((item, index) => {
    const quantity = expenseType === 'footage_expenses' ? 1 : Math.max(0, toAmount(item.quantity, 1));
    const requestedGstRate = item.gst_rate === undefined || item.gst_rate === null || item.gst_rate === ''
      ? 18
      : Number(item.gst_rate);
    if (!Number.isFinite(requestedGstRate) || requestedGstRate < 0 || requestedGstRate > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', `GST rate must be between 0 and 100 for row ${index + 1}.`);
    }
    const gstRate = Number(requestedGstRate.toFixed(2));
    const unitPrice = expenseType === 'footage_expenses'
      ? toAmount(item.amount_excl_tax)
      : toAmount(item.unit_price);
    const amountExclTax = expenseType === 'footage_expenses'
      ? toAmount(item.amount_excl_tax)
      : quantity * unitPrice;
    const saleTax = expenseType === 'footage_expenses'
      ? toAmount(item.sale_tax, amountExclTax * (gstRate / 100))
      : amountExclTax * (gstRate / 100);
    const amountInclTax = expenseType === 'footage_expenses'
      ? toAmount(item.amount_incl_tax, amountExclTax + saleTax)
      : amountExclTax + saleTax;
    const description = String(item.description || item.nature_of_work || item.branch_name || '').trim();

    if (!description) throw new AppError(400, 'VALIDATION_ERROR', `Description is required for row ${index + 1}.`);
    if (amountExclTax < 0 || saleTax < 0 || amountInclTax < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', `Amounts cannot be negative for row ${index + 1}.`);
    }

    return {
      description,
      quantity,
      unit_price: unitPrice,
      gst_rate: gstRate,
      total_without_tax: amountExclTax,
      tax_amount: saleTax,
      total_with_tax: amountInclTax,
      brand_model: String(item.brand_model || item.product_name || description).trim(),
      branch_code: String(item.branch_code || data.branch_code || '').trim(),
      branch_name: String(item.branch_name || data.branch_name || '').trim(),
      region: String(item.region || data.region || 'Karachi').trim(),
      footage_approval_date: item.footage_approval_date || null,
      footage_retrieval_date: item.footage_retrieval_date || null,
      row_invoice_date: item.invoice_date || data.invoice_date || null,
      row_invoice_no: item.invoice_no || null,
      fbr_invoice_no: item.fbr_invoice_no || data.fbr_invoice_no || '-',
      po_number: item.po_number || data.po_number || '-',
    };
  });
}

export async function createDirectInvoice(data = {}, actor = {}) {
  const customerId = String(data.customer_id || '').trim();
  if (!customerId) throw new AppError(400, 'VALIDATION_ERROR', 'Client / Bank is required.');

  const expenseType = normalizeExpenseType(data.expense_type);
  const workDescription = String(data.work_description || '').trim();
  if (!workDescription) throw new AppError(400, 'VALIDATION_ERROR', 'Work description is required.');

  const invoiceDate = data.invoice_date || new Date().toISOString().slice(0, 10);
  const invoiceColumns = await getPublicTableColumns('customer_invoices');
  const idempotencyKey = String(data.idempotency_key || '').trim() || null;

  if (idempotencyKey && invoiceColumns.has('idempotency_key')) {
    const existing = await pool.query(`SELECT id FROM public.customer_invoices WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existing.rows[0]) return getFinanceInvoice(existing.rows[0].id);
  }

  const customer = await pool.query(`SELECT id, customer_name FROM public.customers WHERE id = $1`, [customerId]);
  if (!customer.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Selected client was not found.');

  const items = normalizeDirectItems(data, expenseType);
  const subtotal = items.reduce((sum, item) => sum + item.total_without_tax, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.total_with_tax, 0);
  const invoiceFormat = normalizeInvoiceFormat(data.invoice_format, expenseType);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceNumber = await nextCustomerInvoiceNumber(client);
    const refNo = String(data.ref_no || `REF-${invoiceNumber.replace('INV-', '')}`).trim();
    const notes = {
      source: 'finance_direct',
      expense_type: expenseType,
      invoice_format: invoiceFormat,
      finance_approval_status: 'APPROVED',
      finance_generated_at: todayIso(),
      finance_generated_by: actor?.id || actor?.userId || null,
      prepared_by: actor?.name || actor?.full_name || actor?.email || 'Finance Officer',
      ref_no: refNo,
      branch_name: String(data.branch_name || '').trim() || '-',
      branch_code: String(data.branch_code || '').trim() || '-',
      region: String(data.region || 'Karachi').trim(),
      po_number: String(data.po_number || '').trim() || '-',
      work_description: workDescription,
      fbr_invoice_no: String(data.fbr_invoice_no || '').trim() || '-',
      footage_rows: expenseType === 'footage_expenses' ? items : [],
    };

    const insertValues = {
      invoice_number: invoiceNumber,
      customer_id: customerId,
      invoice_date: invoiceDate,
      currency: 'PKR',
      exchange_rate: 1,
      template_name: 'HBL GST Invoice',
      tax_type: 'GST',
      tax_rate: items[0]?.gst_rate ?? 18,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_in_words: numberToWords(totalAmount),
      number_of_copies: 1,
      status: 'ISSUED',
      notes: JSON.stringify(notes),
      idempotency_key: idempotencyKey,
    };

    const insertColumns = Object.keys(insertValues).filter((column) => invoiceColumns.has(column));
    const params = insertColumns.map((column) => insertValues[column]);
    const placeholders = insertColumns.map((_, index) => `$${index + 1}`);
    const invoiceRes = await client.query(
      `
        INSERT INTO public.customer_invoices (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
      `,
      params,
    );

    for (const item of items) {
      await client.query(
        `
          INSERT INTO public.customer_invoice_items (
            invoice_id,
            product_id,
            description,
            quantity,
            unit_price,
            total_without_tax,
            tax_amount,
            total_with_tax
          )
          VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
        `,
        [
          invoiceRes.rows[0].id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total_without_tax,
          item.tax_amount,
          item.total_with_tax,
        ],
      );
    }

    await client.query('COMMIT');
    return getFinanceInvoice(invoiceRes.rows[0].id);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505' && idempotencyKey && invoiceColumns.has('idempotency_key')) {
      const existing = await pool.query(`SELECT id FROM public.customer_invoices WHERE idempotency_key = $1`, [idempotencyKey]);
      if (existing.rows[0]) return getFinanceInvoice(existing.rows[0].id);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateFinanceInvoice(id, data = {}, actor = {}) {
  const current = await getFinanceInvoice(id);
  const customerId = String(data.customer_id || current.customer_id || '').trim();
  if (!customerId) throw new AppError(400, 'VALIDATION_ERROR', 'Client / Bank is required.');

  const customer = await pool.query(`SELECT id, customer_name FROM public.customers WHERE id = $1`, [customerId]);
  if (!customer.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Selected client was not found.');

  const currentNotes = parseNotes(current.notes || current.notes_json);
  const expenseType = normalizeExpenseType(data.expense_type || currentNotes.expense_type || current.expense_type);
  const invoiceFormat = normalizeInvoiceFormat(data.invoice_format || currentNotes.invoice_format || current.invoice_format, expenseType);
  const sourceItems = Array.isArray(data.items) && data.items.length ? data.items : current.items || [];
  const workDescription = String(data.work_description || currentNotes.work_description || current.work_description || EXPENSE_TYPES[expenseType]?.natureOfWork || 'Services').trim();
  const invoiceDate = data.invoice_date || current.invoice_date || new Date().toISOString().slice(0, 10);
  const items = normalizeDirectItems({ ...data, items: sourceItems, work_description: workDescription, invoice_date: invoiceDate }, expenseType);

  const subtotal = items.reduce((sum, item) => sum + item.total_without_tax, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.total_with_tax, 0);
  const status = String(data.status || current.status || 'ISSUED').trim().toUpperCase();
  const refNo = String(data.ref_no || currentNotes.ref_no || current.ref_no || '-').trim() || '-';
  const notes = {
    ...currentNotes,
    source: currentNotes.source || 'finance_direct',
    expense_type: expenseType,
    invoice_format: invoiceFormat,
    finance_approval_status: status === 'CANCELLED' || status === 'VOIDED' ? 'REJECTED' : status === 'DRAFT' ? 'PENDING' : 'APPROVED',
    finance_updated_at: todayIso(),
    finance_updated_by: actor?.id || actor?.userId || null,
    prepared_by: currentNotes.prepared_by || actor?.name || actor?.full_name || actor?.email || 'Finance Officer',
    ref_no: refNo,
    branch_name: String(data.branch_name || currentNotes.branch_name || current.branch_name || '').trim() || '-',
    branch_code: String(data.branch_code || currentNotes.branch_code || current.branch_code || '').trim() || '-',
    region: String(data.region || currentNotes.region || current.region || 'Karachi').trim(),
    po_number: String(data.po_number || currentNotes.po_number || current.po_number || '').trim() || '-',
    work_description: workDescription,
    fbr_invoice_no: String(data.fbr_invoice_no || currentNotes.fbr_invoice_no || current.fbr_invoice_no || '').trim() || '-',
    footage_rows: expenseType === 'footage_expenses' ? items : [],
  };

  const invoiceColumns = await getPublicTableColumns('customer_invoices');
  const updateValues = {
    customer_id: customerId,
    invoice_date: invoiceDate,
    currency: data.currency || current.currency || 'PKR',
    exchange_rate: toAmount(data.exchange_rate, toAmount(current.exchange_rate, 1)),
    template_name: data.template_name || current.template_name || 'HBL GST Invoice',
    tax_type: data.tax_type || current.tax_type || 'GST',
    tax_rate: items[0]?.gst_rate ?? toAmount(current.tax_rate, 18),
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount_in_words: numberToWords(totalAmount),
    status,
    notes: JSON.stringify(notes),
  };
  const updateColumns = Object.keys(updateValues).filter((column) => invoiceColumns.has(column));
  const setClauses = updateColumns.map((column, index) => `${column} = $${index + 2}`);
  if (invoiceColumns.has('updated_at')) setClauses.push('updated_at = NOW()');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE public.customer_invoices
        SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING id
      `,
      [id, ...updateColumns.map((column) => updateValues[column])],
    );

    await client.query(`DELETE FROM public.customer_invoice_items WHERE invoice_id = $1`, [id]);
    for (const item of items) {
      await client.query(
        `
          INSERT INTO public.customer_invoice_items (
            invoice_id,
            product_id,
            description,
            quantity,
            unit_price,
            total_without_tax,
            tax_amount,
            total_with_tax
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.total_without_tax,
          item.tax_amount,
          item.total_with_tax,
        ],
      );
    }

    await client.query('COMMIT');
    return getFinanceInvoice(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteFinanceInvoice(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleted = await client.query(`DELETE FROM public.customer_invoices WHERE id = $1 RETURNING id`, [id]);
    if (!deleted.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Finance invoice was not found.');
    await client.query('COMMIT');
    return { deleted: true, id: deleted.rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listFinanceInvoices(filters = {}) {
  const rows = await queryInvoices('');
  let invoices = rows.map((row) => basicInvoiceShape(row));

  if (filters.expense_type && filters.expense_type !== 'all') {
    const expenseType = normalizeExpenseType(filters.expense_type);
    invoices = invoices.filter((invoice) => invoice.expense_type === expenseType);
  }
  if (filters.status && filters.status !== 'all') {
    invoices = invoices.filter((invoice) => String(invoice.status || '').toUpperCase() === String(filters.status).toUpperCase());
  }
  if (filters.customer_id) {
    invoices = invoices.filter((invoice) => String(invoice.customer_id) === String(filters.customer_id));
  }
  if (filters.region) {
    invoices = invoices.filter((invoice) => String(invoice.region || '').toLowerCase().includes(String(filters.region).toLowerCase()));
  }
  if (filters.month) {
    invoices = invoices.filter((invoice) => dateKey(invoice.invoice_date || invoice.created_at).startsWith(filters.month));
  }
  if (filters.search) {
    const needle = String(filters.search).toLowerCase();
    invoices = invoices.filter((invoice) => [
      invoice.invoice_number,
      invoice.customer_name,
      invoice.ref_no,
      invoice.branch_name,
      invoice.branch_code,
      invoice.region,
      invoice.po_number,
      invoice.work_description,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }

  return invoices;
}

export async function getFinanceInvoice(id) {
  const invoice = await getInvoiceRow(id);
  const items = await getInvoiceItems(id);
  const breakdown = await getBillBreakdown(invoice);
  return {
    ...basicInvoiceShape(invoice, breakdown),
    company: COMPANY_DETAILS,
    buyer: HBL_BUYER_DETAILS,
    items,
    breakdown,
  };
}

export async function getFinanceSummaries(filters = {}) {
  const invoices = await listFinanceInvoices(filters);
  const rows = invoices.map((invoice) => ({
    id: invoice.id,
    ref_no: invoice.ref_no,
    date: invoice.invoice_date || invoice.created_at,
    client: invoice.customer_name || '-',
    branch: invoice.branch_name,
    branch_code: invoice.branch_code,
    region: invoice.region,
    work_description: invoice.work_description,
    invoice_no: invoice.invoice_number,
    po_no: invoice.po_number,
    fbr_invoice_no: invoice.fbr_invoice_no,
    expense_type: invoice.expense_type,
    amount_excl_tax: invoice.amount_excl_tax,
    sale_tax: invoice.sale_tax,
    amount_incl_tax: invoice.amount_incl_tax,
    status: invoice.status,
  }));

  const byExpenseType = Object.values(EXPENSE_TYPES).map((type) => {
    const records = rows.filter((row) => row.expense_type === type.key);
    const amountExclTax = records.reduce((sum, row) => sum + row.amount_excl_tax, 0);
    const saleTax = records.reduce((sum, row) => sum + row.sale_tax, 0);
    const amountInclTax = records.reduce((sum, row) => sum + row.amount_incl_tax, 0);
    return {
      expense_type: type.key,
      expense_type_label: type.label,
      label: type.label,
      invoice_count: records.length,
      count: records.length,
      amount_excl_tax: amountExclTax,
      sale_tax: saleTax,
      amount_incl_tax: amountInclTax,
      total_amount: amountInclTax,
    };
  });

  const clientMap = new Map();
  for (const row of rows) {
    const key = row.client || '-';
    const current = clientMap.get(key) || {
      client: key,
      count: 0,
      amount_excl_tax: 0,
      sale_tax: 0,
      amount_incl_tax: 0,
    };
    current.count += 1;
    current.amount_excl_tax += row.amount_excl_tax;
    current.sale_tax += row.sale_tax;
    current.amount_incl_tax += row.amount_incl_tax;
    clientMap.set(key, current);
  }

  return {
    rows,
    monthly_summary: rows,
    totals: {
      count: rows.length,
      invoice_count: rows.length,
      amount_excl_tax: rows.reduce((sum, row) => sum + row.amount_excl_tax, 0),
      sale_tax: rows.reduce((sum, row) => sum + row.sale_tax, 0),
      amount_incl_tax: rows.reduce((sum, row) => sum + row.amount_incl_tax, 0),
      tax_amount: rows.reduce((sum, row) => sum + row.sale_tax, 0),
      total_amount: rows.reduce((sum, row) => sum + row.amount_incl_tax, 0),
    },
    by_expense_type: byExpenseType,
    by_client: Array.from(clientMap.values()).map((row) => ({
      ...row,
      customer_name: row.client,
      invoice_count: row.count,
      total_amount: row.amount_incl_tax,
    })).sort((a, b) => b.amount_incl_tax - a.amount_incl_tax),
  };
}

export async function getAccountsOverview() {
  const invoices = await listFinanceInvoices({});
  const issued = invoices.filter((invoice) => String(invoice.status || '').toUpperCase() !== 'CANCELLED');
  const ledger = issued.flatMap((invoice) => {
    const date = invoice.invoice_date || invoice.created_at;
    const description = `${invoice.invoice_number} - ${invoice.customer_name || 'Client'} - ${invoice.expense_label || invoice.expense_type_label || 'Invoice'}`;
    const revenueAccount = ['capital_expenses', 'complex_expenses'].includes(invoice.expense_type)
      ? 'Equipment Revenue'
      : 'Service Revenue';
    return [
      {
        date,
        ref: invoice.invoice_number,
        account: 'Accounts Receivable',
        description,
        debit: invoice.amount_incl_tax,
        credit: 0,
      },
      {
        date,
        ref: invoice.invoice_number,
        account: revenueAccount,
        description,
        debit: 0,
        credit: invoice.amount_excl_tax,
      },
      {
        date,
        ref: invoice.invoice_number,
        account: 'Sales Tax Payable',
        description,
        debit: 0,
        credit: invoice.sale_tax,
      },
    ];
  });
  const totalDebit = ledger.reduce((sum, row) => sum + toAmount(row.debit), 0);
  const totalCredit = ledger.reduce((sum, row) => sum + toAmount(row.credit), 0);

  return {
    chart_of_accounts: [
      { code: '1200', name: 'Accounts Receivable', type: 'Asset', category: 'Asset' },
      { code: '2200', name: 'Sales Tax Payable', type: 'Liability', category: 'Liability' },
      { code: '4000', name: 'Service Revenue', type: 'Revenue', category: 'Revenue' },
      { code: '4100', name: 'Equipment Revenue', type: 'Revenue', category: 'Revenue' },
      { code: '5100', name: 'Field Service Cost', type: 'Expense', category: 'Expense' },
    ],
    ledger: ledger.slice().reverse(),
    summary: {
      debit: totalDebit,
      credit: totalCredit,
      balance: totalDebit - totalCredit,
      total_invoiced: issued.reduce((sum, invoice) => sum + invoice.amount_incl_tax, 0),
      total_collected: issued
        .filter((invoice) => String(invoice.status || '').toUpperCase() === 'PAID')
        .reduce((sum, invoice) => sum + invoice.amount_incl_tax, 0),
      outstanding: issued
        .filter((invoice) => String(invoice.status || '').toUpperCase() === 'ISSUED')
        .reduce((sum, invoice) => sum + invoice.amount_incl_tax, 0),
    },
  };
}
