import { apiClient } from "./apiClient";

export type FinanceExpenseType =
  | "operational_expenses"
  | "capital_expenses"
  | "complex_expenses"
  | "rental_expenses"
  | "footage_expenses";

export interface FinanceCompanyDetails {
  company_name: string;
  address: string;
  phone: string;
  ntn: string;
  gst: string;
  account_title: string;
  account_no: string;
  bank: string;
}

export interface FinanceInvoiceItem {
  description?: string;
  product_name?: string;
  brand_model?: string;
  brand_make?: string;
  model_no?: string;
  product_image_url?: string;
  quantity?: number;
  unit_price?: number;
  gst_rate?: number;
  total_without_tax?: number;
  tax_amount?: number;
  total_with_tax?: number;
  amount_excl_tax?: number;
  sale_tax?: number;
  amount_incl_tax?: number;
  branch_code?: string;
  branch_name?: string;
  region?: string;
  footage_approval_date?: string;
  footage_retrieval_date?: string;
  invoice_date?: string;
  invoice_no?: string;
  po_number?: string;
  fbr_invoice_no?: string;
}

export interface FinanceInvoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  customer_id?: string;
  quotation_id?: string;
  quotation_number?: string;
  order_number?: string;
  token_number?: string;
  dispatch_number?: string;
  template_name?: string;
  invoice_format?: string;
  expense_type?: FinanceExpenseType;
  expense_type_label?: string;
  status: string;
  approval_status?: string;
  invoice_date?: string;
  created_at?: string;
  updated_at?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  amount_in_words?: string;
  branch_name?: string;
  branch_code?: string;
  region?: string;
  po_number?: string;
  fbr_invoice_no?: string;
  notes?: Record<string, any>;
  notes_json?: Record<string, any>;
  items?: FinanceInvoiceItem[];
  breakdown?: FinanceBillBreakdown;
  original_amount?: number;
  returns_deducted?: number;
  extra_added?: number;
  final_amount?: number;
}

export interface FinanceCustomer {
  id: string;
  customer_name: string;
  company_name?: string;
  customer_category?: string;
  organization_type?: string;
  service_categories?: string[];
  service_description?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface DirectFinanceInvoicePayload {
  idempotency_key: string;
  expense_type: FinanceExpenseType;
  invoice_format?: string;
  customer_id: string;
  branch_name?: string;
  branch_code?: string;
  region?: string;
  ref_no?: string;
  invoice_date?: string;
  po_number?: string;
  work_description: string;
  fbr_invoice_no?: string;
  change_reason?: string;
  items: FinanceInvoiceItem[];
}

export interface FinanceBillBreakdown {
  installed_items: Array<Record<string, any>>;
  returned_items: Array<Record<string, any>>;
  extra_items: Array<Record<string, any>>;
  original_total: number;
  original_amount?: number;
  returns_deducted: number;
  extra_added: number;
  final_amount: number;
}

export interface FinanceBillingApproval extends FinanceInvoice {
  bill_breakdown?: FinanceBillBreakdown;
  submitted_date?: string;
}

export const financeService = {
  getMeta: async (): Promise<{ company: FinanceCompanyDetails; buyer: Record<string, any>; expense_types: Record<string, string> }> => {
    const res = await apiClient.get("/finance/meta");
    return res.data.data;
  },

  getDashboard: async (params?: Record<string, any>) => {
    const res = await apiClient.get("/finance/dashboard", { params });
    return res.data.data;
  },

  getBillingApprovals: async (params?: Record<string, any>): Promise<FinanceBillingApproval[]> => {
    const res = await apiClient.get("/finance/billing-approvals", { params });
    return res.data.data || [];
  },

  getBillingApproval: async (id: string): Promise<FinanceBillingApproval> => {
    const res = await apiClient.get(`/finance/billing-approvals/${id}`);
    return res.data.data;
  },

  approveBillingApproval: async (id: string, payload: Record<string, any>): Promise<FinanceBillingApproval> => {
    const res = await apiClient.post(`/finance/billing-approvals/${id}/approve`, payload);
    return res.data.data;
  },

  rejectBillingApproval: async (id: string, reason: string): Promise<FinanceBillingApproval> => {
    const res = await apiClient.post(`/finance/billing-approvals/${id}/reject`, { reason });
    return res.data.data;
  },

  getInvoices: async (params?: Record<string, any>): Promise<FinanceInvoice[]> => {
    const res = await apiClient.get("/finance/invoices", { params });
    return res.data.data || [];
  },

  getCustomers: async (params?: Record<string, any>): Promise<FinanceCustomer[]> => {
    const res = await apiClient.get("/finance/customers", { params });
    return res.data.data || [];
  },

  createInvoice: async (payload: DirectFinanceInvoicePayload): Promise<FinanceInvoice> => {
    const res = await apiClient.post("/finance/invoices", payload);
    return res.data.data;
  },

  getInvoice: async (id: string): Promise<FinanceInvoice> => {
    const res = await apiClient.get(`/finance/invoices/${id}`);
    return res.data.data;
  },

  updateInvoice: async (id: string, payload: Partial<DirectFinanceInvoicePayload> & { status?: string }): Promise<FinanceInvoice> => {
    const res = await apiClient.put(`/finance/invoices/${id}`, payload);
    return res.data.data;
  },

  deleteInvoice: async (id: string): Promise<{ deleted: boolean; id: string }> => {
    const res = await apiClient.delete(`/finance/invoices/${id}`);
    return res.data.data;
  },

  getSummaries: async (params?: Record<string, any>) => {
    const res = await apiClient.get("/finance/summaries", { params });
    return res.data.data;
  },

  getAccounts: async () => {
    const res = await apiClient.get("/finance/accounts");
    return res.data.data;
  },
};
