import { apiClient } from './apiClient';

export interface ClientInvoiceTemplate {
  id: string;
  customer_id?: string;
  customer_name?: string;
  template_name: string;
  tax_type?: string;
  default_tax_rate?: number;
  number_of_copies?: number;
  custom_header?: string;
  custom_footer?: string;
  template_config?: Record<string, any>;
}

export interface ClientInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_without_tax: number;
  tax_amount: number;
  total_with_tax: number;
}

export interface ClientInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  currency: string;
  exchange_rate: number;
  template_name: string;
  tax_type: string;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_in_words?: string;
  number_of_copies: number;
  status: string;
  created_at: string;
  items?: ClientInvoiceItem[];
}

export interface ClientInvoiceSummary {
  id: string;
  customer_id?: string;
  customer_name?: string;
  summary_period: string;
  summary_type?: string;
  summary_limit?: number;
  is_over_limit?: boolean;
  invoice_ids?: string[];
  invoice_numbers: string[] | any;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  branch_breakdown?: any[];
  status: string;
  notes?: string;
  created_at: string;
}

export const invoicingApi = {
  getTemplates: async (customer_id?: string): Promise<ClientInvoiceTemplate[]> => {
    const res = await apiClient.get('/invoicing/templates', { params: { customer_id } });
    return res.data.data || [];
  },

  saveTemplate: async (data: Partial<ClientInvoiceTemplate>): Promise<ClientInvoiceTemplate> => {
    const res = await apiClient.post('/invoicing/templates', data);
    return res.data.data;
  },

  getInvoices: async (params?: Record<string, any>): Promise<ClientInvoice[]> => {
    const res = await apiClient.get('/invoicing/invoices', { params });
    return res.data.data || [];
  },

  getInvoice: async (id: string): Promise<ClientInvoice> => {
    const res = await apiClient.get(`/invoicing/invoices/${id}`);
    return res.data.data;
  },

  createInvoice: async (data: any): Promise<ClientInvoice> => {
    const res = await apiClient.post('/invoicing/invoices', data);
    return res.data.data;
  },

  updateInvoice: async (id: string, data: any): Promise<ClientInvoice> => {
    const res = await apiClient.put(`/invoicing/invoices/${id}`, data);
    return res.data.data;
  },

  updateInvoiceStatus: async (id: string, status: string): Promise<ClientInvoice> => {
    const res = await apiClient.patch(`/invoicing/invoices/${id}/status`, { status });
    return res.data.data;
  },

  getSummaries: async (params?: Record<string, any>): Promise<ClientInvoiceSummary[]> => {
    const res = await apiClient.get('/invoicing/summaries', { params });
    return res.data.data || [];
  },

  createSummary: async (data: {
    customer_id: string;
    summary_period: string;
    summary_type?: string;
    summary_limit?: number;
    invoice_ids?: string[];
    notes?: string;
  }): Promise<ClientInvoiceSummary> => {
    const res = await apiClient.post('/invoicing/summaries', data);
    return res.data.data;
  },
};
