import { apiClient } from "../../services/apiClient";

export type CrmStatus = "DRAFT" | "MANAGEMENT_PENDING" | "MANAGEMENT_APPROVED" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface CrmCustomer {
  id: string;
  customer_name: string;
  company_name?: string;
  customer_type?: string;
  customer_category?: string;
  organization_type?: string;
  service_categories?: string[];
  service_description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  is_active?: boolean;
  deleted_at?: string | null;
  disabled_at?: string | null;
  vehicle_count?: number;
}

export interface CrmProduct {
  id: string;
  product_name: string;
  description?: string;
  product_type?: string;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  price_tiers?: Record<string, number | string>;
  category_name?: string;
}

export interface CrmQuotationItem {
  id?: string;
  product_id?: string | null;
  product_name?: string;
  description: string;
  item_description?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface CrmQuotation {
  id: string;
  quotation_number?: string;
  version?: number | string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  lead_title?: string;
  price_tier?: string;
  template_style?: string;
  status: CrmStatus;
  approval_stage?: string;
  management_approved_at?: string;
  management_approval_note?: string;
  currency?: string;
  exchange_rate?: number;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  terms?: string;
  notes?: string;
  client_approval_token?: string;
  sent_at?: string;
  client_approved_at?: string;
  email_delivery_status?: "NOT_SENT" | "SENDING" | "SENT" | "FAILED";
  email_sent_at?: string;
  email_recipient?: string;
  email_error?: string;
  email_error_code?: string;
  email_configured?: boolean;
  email_delivery?: { status: "SENT" | "FAILED"; recipient?: string; message?: string; code?: string };
  approval_remarks?: string;
  item_count?: number;
  order_id?: string;
  order_number?: string;
  order_status?: string;
  created_at?: string;
  updated_at?: string;
  items?: CrmQuotationItem[];
}

export interface CrmOrder {
  id: string;
  order_number: string;
  token_number: string;
  quotation_id: string;
  quotation_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  status: string;
  total_amount?: number;
  item_count?: number;
  created_at?: string;
}

export interface CrmLead {
  id: string;
  title: string;
  customer_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface CrmComplaint {
  id: string;
  complaint_no: string;
  customer_id?: string;
  customer_name?: string;
  crm_order_id?: string;
  order_number?: string;
  tracker_serial?: string;
  complaint_type?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status?: string;
  description?: string;
  reported_at?: string;
}

export interface CrmInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  status?: string;
  currency?: string;
  template_name?: string;
  tax_rate?: number;
  total_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  amount_in_words?: string;
  notes?: string;
  created_at?: string;
  items?: Array<{
    id?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    total_without_tax?: number;
    tax_amount?: number;
    total_with_tax?: number;
  }>;
  bill_breakdown?: {
    installed_items?: Array<{ id?: string; product_name?: string; quantity?: number; unit_price?: number; amount?: number }>;
    returned_items?: Array<{ id?: string; product_name?: string; quantity?: number; unit_price?: number; amount?: number }>;
    extra_items?: Array<{ id?: string; product_name?: string; quantity?: number; unit_price?: number; amount?: number }>;
    original_total?: number;
    original_amount?: number;
    returns_deducted?: number;
    extra_added?: number;
    final_before_tax?: number;
    tax_amount?: number;
    final_amount?: number;
  };
}

function rows<T>(response: any): T[] {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function record<T>(response: any): T {
  return response?.data?.data ?? response?.data;
}

export function approvalLink(token?: string) {
  if (!token) return "";
  return `${window.location.origin}/client/quotations/${token}`;
}

export function quotationEmailSetupPending(quote: CrmQuotation): boolean {
  const code = quote.email_error_code || quote.email_delivery?.code;
  return quote.email_configured !== true && quote.email_delivery_status !== "SENT" && ["SMTP_NOT_CONFIGURED", "PUBLIC_URL_NOT_CONFIGURED"].includes(code || "");
}

export function quotationDeliveryNotice(quote: CrmQuotation): { message: string; type: "success" | "error" } {
  if (quotationEmailSetupPending(quote)) {
    return { message: "Quotation saved. Copy Client Link and share it for approval. Automatic email setup is pending.", type: "success" };
  }
  if (quote.email_delivery_status === "SENT" || quote.email_delivery?.status === "SENT") {
    return { message: `Quotation email submitted to ${quote.email_recipient || quote.email_delivery?.recipient || quote.customer_email || "the client"}. Awaiting client approval.`, type: "success" };
  }
  return { message: `Quotation saved. ${quote.email_error || quote.email_delivery?.message || "Email was not sent. Configure SMTP or retry from the quotation."}`, type: "error" };
}

export function makeIdempotencyKey(prefix: string) {
  const cryptoObj = window.crypto;
  if (cryptoObj?.randomUUID) return `${prefix}-${cryptoObj.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function productPrice(product: CrmProduct, priceTier = "TIER_A") {
  const tierPrice = product.price_tiers?.[priceTier];
  const parsedTier = Number(tierPrice);
  if (Number.isFinite(parsedTier) && parsedTier > 0) return parsedTier;
  const unit = Number(product.unit_price);
  return Number.isFinite(unit) ? unit : 0;
}

export const crmApi = {
  listCustomers: async (): Promise<CrmCustomer[]> => {
    const res = await apiClient.get("/crm/customers");
    return rows<CrmCustomer>(res);
  },

  createCustomer: async (data: Partial<CrmCustomer>): Promise<CrmCustomer> => {
    const res = await apiClient.post("/crm/customers", data);
    return record<CrmCustomer>(res);
  },

  updateCustomer: async (id: string, data: Partial<CrmCustomer>): Promise<CrmCustomer> => {
    const res = await apiClient.patch(`/crm/customers/${id}`, data);
    return record<CrmCustomer>(res);
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/crm/customers/${id}`);
  },

  listProducts: async (params?: Record<string, any>): Promise<CrmProduct[]> => {
    const res = await apiClient.get("/crm/products", { params });
    return rows<CrmProduct>(res);
  },

  listLeads: async (): Promise<CrmLead[]> => {
    const res = await apiClient.get("/crm/leads");
    return rows<CrmLead>(res);
  },

  listQuotations: async (params?: Record<string, any>): Promise<CrmQuotation[]> => {
    const res = await apiClient.get("/crm/quotations", { params });
    return rows<CrmQuotation>(res);
  },

  getQuotation: async (id: string): Promise<CrmQuotation> => {
    const res = await apiClient.get(`/crm/quotations/${id}`);
    return record<CrmQuotation>(res);
  },

  createQuotation: async (data: any, idempotencyKey: string): Promise<CrmQuotation> => {
    const res = await apiClient.post("/crm/quotations", data, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return record<CrmQuotation>(res);
  },

  updateQuotation: async (id: string, data: any): Promise<CrmQuotation> => {
    const res = await apiClient.put(`/crm/quotations/${id}`, data);
    return record<CrmQuotation>(res);
  },

  updateQuotationStatus: async (id: string, status: CrmStatus, data: Record<string, any> = {}): Promise<CrmQuotation> => {
    const res = await apiClient.patch(`/crm/quotations/${id}/status`, { status, ...data });
    return record<CrmQuotation>(res);
  },

  sendQuotationEmail: async (id: string): Promise<CrmQuotation> => {
    const res = await apiClient.post(`/crm/quotations/${id}/send-email`);
    return record<CrmQuotation>(res);
  },

  convertQuotationToOrder: async (id: string): Promise<CrmOrder> => {
    const res = await apiClient.post(`/crm/quotations/${id}/convert-to-order`);
    return record<CrmOrder>(res);
  },

  listOrders: async (params?: Record<string, any>): Promise<CrmOrder[]> => {
    const res = await apiClient.get("/crm/orders", { params });
    return rows<CrmOrder>(res);
  },

  listComplaints: async (params?: Record<string, any>): Promise<CrmComplaint[]> => {
    const res = await apiClient.get("/crm/complaints", { params });
    return rows<CrmComplaint>(res);
  },

  createComplaint: async (data: Record<string, any>): Promise<CrmComplaint> => {
    const res = await apiClient.post("/crm/complaints", data);
    return record<CrmComplaint>(res);
  },

  listInvoices: async (params?: Record<string, any>): Promise<CrmInvoice[]> => {
    const res = await apiClient.get("/crm/invoices", { params });
    return rows<CrmInvoice>(res);
  },

  getInvoice: async (id: string): Promise<CrmInvoice> => {
    const res = await apiClient.get(`/crm/invoices/${id}`);
    return record<CrmInvoice>(res);
  },

  getPublicQuotation: async (token: string): Promise<CrmQuotation> => {
    const res = await apiClient.get(`/crm/public/quotations/${token}`);
    return record<CrmQuotation>(res);
  },

  approvePublicQuotation: async (token: string, data: Record<string, any>): Promise<CrmQuotation> => {
    const res = await apiClient.post(`/crm/public/quotations/${token}/approve`, data);
    return record<CrmQuotation>(res);
  },

  rejectPublicQuotation: async (token: string, data: Record<string, any>): Promise<CrmQuotation> => {
    const res = await apiClient.post(`/crm/public/quotations/${token}/reject`, data);
    return record<CrmQuotation>(res);
  },
};
