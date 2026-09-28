import { apiClient as api } from './apiClient';

export interface SalesLead {
  id: string;
  lead_number: string;
  title: string;
  customer_name?: string;
  estimated_value: number;
  status: string;
  created_at: string;
}

export interface SalesQuotation {
  id: string;
  quotation_number: string;
  customer_name?: string;
  quotation_type: 'PRODUCT' | 'SERVICE_PROJECT';
  total_amount: number;
  status: string;
  created_at: string;
}

export interface ERPProject {
  id: string;
  project_number: string;
  project_name: string;
  customer_name?: string;
  status: string;
  budget: number;
  assigned_team_count?: number;
  created_at: string;
}

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  project_name?: string;
  pr_type: 'CLIENT_INVENTORY' | 'INTERNAL_ASSET';
  requested_by_email?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface ServiceTicket {
  id: string;
  ticket_number: string;
  customer_name?: string;
  project_name?: string;
  technician_email?: string;
  complaint_type: string;
  status: string;
  description?: string;
  otp_code?: string;
  otp_verified: boolean;
  created_at: string;
}

export interface VirtualDebt {
  id: string;
  debt_number: string;
  technician_email?: string;
  ticket_number?: string;
  amount_collected: number;
  status: 'UNRECONCILED' | 'RECONCILED';
  collected_at: string;
}

export const matrixApi = {
  getLeads: async (): Promise<SalesLead[]> => {
    const res = await api.get('/matrix/leads');
    return res.data.data;
  },

  createLead: async (data: Partial<SalesLead>): Promise<SalesLead> => {
    const res = await api.post('/matrix/leads', data);
    return res.data.data;
  },

  getQuotations: async (): Promise<SalesQuotation[]> => {
    const res = await api.get('/matrix/quotations');
    return res.data.data;
  },

  createQuotation: async (data: any): Promise<SalesQuotation> => {
    const res = await api.post('/matrix/quotations', data);
    return res.data.data;
  },

  activateProject: async (quotation_id: string): Promise<ERPProject> => {
    const res = await api.post(`/matrix/quotations/${quotation_id}/activate-project`);
    return res.data.data;
  },

  getProjects: async (): Promise<ERPProject[]> => {
    const res = await api.get('/matrix/projects');
    return res.data.data;
  },

  assignResource: async (data: { project_id: string; employee_id: string; role_in_project?: string }): Promise<any> => {
    const res = await api.post('/matrix/projects/assign', data);
    return res.data.data;
  },

  getPurchaseRequisitions: async (): Promise<PurchaseRequisition[]> => {
    const res = await api.get('/matrix/pr');
    return res.data.data;
  },

  createPurchaseRequisition: async (data: any): Promise<PurchaseRequisition> => {
    const res = await api.post('/matrix/pr', data);
    return res.data.data;
  },

  stockOutToEmployee: async (data: { employee_id: string; product_id?: string; asset_type?: string }): Promise<any> => {
    const res = await api.post('/matrix/stock-out/employee', data);
    return res.data.data;
  },

  getServiceTickets: async (): Promise<ServiceTicket[]> => {
    const res = await api.get('/matrix/tickets');
    return res.data.data;
  },

  createServiceTicket: async (data: Partial<ServiceTicket>): Promise<ServiceTicket> => {
    const res = await api.post('/matrix/tickets', data);
    return res.data.data;
  },

  triggerOTP: async (ticket_id: string): Promise<any> => {
    const res = await api.post(`/matrix/tickets/${ticket_id}/trigger-otp`);
    return res.data.data;
  },

  verifyOTP: async (data: { ticket_id: string; input_otp: string; photo_proof_url?: string; customer_signature?: string }): Promise<ServiceTicket> => {
    const res = await api.post('/matrix/tickets/verify-otp', data);
    return res.data.data;
  },

  getVirtualDebts: async (): Promise<VirtualDebt[]> => {
    const res = await api.get('/matrix/virtual-debts');
    return res.data.data;
  },

  recordCashCollection: async (data: { ticket_id?: string; technician_id: string; amount_collected: number }): Promise<VirtualDebt> => {
    const res = await api.post('/matrix/virtual-debts/record-collection', data);
    return res.data.data;
  },

  reconcileDebt: async (debt_id: string): Promise<VirtualDebt> => {
    const res = await api.post(`/matrix/virtual-debts/${debt_id}/reconcile`);
    return res.data.data;
  },
};
