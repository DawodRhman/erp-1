import { apiClient as api } from './apiClient';

export interface InventorySummary {
  total_products: number;
  low_stock_count: number;
  total_inventory_value: number;
  total_serials: number;
  available_serials: number;
  allocated_serials: number;
  installed_serials: number;
  damaged_serials: number;
  total_pos: number;
  total_invoices: number;
  pending_installations: number;
  active_complaints: number;
  approved_csr_jobs?: number;
  sent_csr_quotes?: number;
}

export interface InventoryWorkQueueJob {
  id: string;
  quotation_number: string;
  customer_id?: string;
  customer_name?: string;
  price_tier?: string;
  template_style?: string;
  status: 'APPROVED' | 'IN_PROGRESS';
  total_amount: number;
  item_count: number;
  total_requested_qty: number;
  created_at: string;
  updated_at?: string;
}

export interface ItemCategory {
  id: string;
  category_name: string;
  description?: string;
  product_count?: number;
}

export interface Product {
  id: string;
  product_name: string;
  category_id?: string;
  category_name?: string;
  product_type: 'ASSET' | 'CONSUMABLE' | 'SERVICE';
  tracking_type: 'SERIAL' | 'IMEI' | 'NONE';
  quantity: number;
  min_stock_level: number;
  unit_price: number;
  cost_price: number;
  price_tiers?: Record<string, number | string>;
  description?: string;
  available_count?: number;
  allocated_count?: number;
  installed_count?: number;
  damaged_count?: number;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  product_name?: string;
  category_name?: string;
  serial_number?: string;
  imei?: string;
  current_status: 'AVAILABLE' | 'ALLOCATED' | 'INSTALLED' | 'RETURNED' | 'DAMAGED';
  location?: string;
  notes?: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id?: string;
  product_name?: string;
  inventory_item_id?: string;
  serial_number?: string;
  imei?: string;
  movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  vehicle_count?: number;
}

export interface CustomerVehicle {
  id: string;
  customer_id: string;
  customer_name?: string;
  vehicle_number: string;
  make?: string;
  model?: string;
  vin?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id?: string;
  vendor_name?: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_delivery_date?: string;
  notes?: string;
  item_count?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  status: string;
  total_amount: number;
  due_date?: string;
  notes?: string;
  item_count?: number;
}

export interface TrackerInstallation {
  id: string;
  installation_no: string;
  customer_id: string;
  customer_name?: string;
  vehicle_number?: string;
  tracker_serial?: string;
  technician_name?: string;
  status: string;
  installation_date?: string;
  notes?: string;
}

export interface CustomerComplaint {
  id: string;
  complaint_no: string;
  customer_id: string;
  customer_name?: string;
  tracker_serial?: string;
  complaint_type: string;
  status: string;
  description?: string;
  reported_at: string;
}

export interface FieldDispatch {
  id: string;
  dispatch_number: string;
  quotation_id?: string;
  quotation_number?: string;
  customer_id?: string;
  customer_name?: string;
  installer_id?: string;
  installer_email?: string;
  site_address?: string;
  status: string;
  notes?: string;
  dispatched_at?: string;
  completed_at?: string;
  created_at?: string;
  items?: FieldDispatchItem[];
  on_the_go_purchases?: FieldPurchase[];
}

export interface FieldDispatchItem {
  id?: string;
  product_id?: string;
  product_name?: string;
  product_type?: string;
  inventory_item_id?: string;
  serial_number?: string;
  imei?: string;
  quantity_issued: number;
  quantity_used?: number;
  quantity_returned?: number;
  unit_of_measure?: string;
  unit_price?: number;
  notes?: string;
}

export interface FieldPurchase {
  id?: string;
  item_description: string;
  vendor_name?: string;
  amount: number;
  receipt_url?: string;
  notes?: string;
}

export const inventoryApi = {
  getSummary: async (): Promise<InventorySummary> => {
    const res = await api.get('/inventory/summary');
    return res.data.data;
  },

  getWorkQueue: async (): Promise<InventoryWorkQueueJob[]> => {
    const res = await api.get('/inventory/work-queue');
    return res.data.data;
  },

  getCategories: async (): Promise<ItemCategory[]> => {
    const res = await api.get('/inventory/categories');
    return res.data.data;
  },

  createCategory: async (data: Partial<ItemCategory>): Promise<ItemCategory> => {
    const res = await api.post('/inventory/categories', data);
    return res.data.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/inventory/categories/${id}`);
  },

  getProducts: async (params?: Record<string, any>): Promise<Product[]> => {
    const res = await api.get('/inventory/products', { params });
    return res.data.data;
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const res = await api.post('/inventory/products', data);
    return res.data.data;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const res = await api.patch(`/inventory/products/${id}`, data);
    return res.data.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/inventory/products/${id}`);
  },

  getItems: async (params?: Record<string, any>): Promise<InventoryItem[]> => {
    const res = await api.get('/inventory/items', { params });
    return res.data.data;
  },

  getMovements: async (params?: Record<string, any>): Promise<InventoryMovement[]> => {
    const res = await api.get('/inventory/movements', { params });
    return res.data.data;
  },

  createItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.post('/inventory/items', data);
    return res.data.data;
  },

  updateItem: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.patch(`/inventory/items/${id}`, data);
    return res.data.data;
  },

  getVendors: async (): Promise<Vendor[]> => {
    const res = await api.get('/inventory/vendors');
    return res.data.data;
  },

  createVendor: async (data: Partial<Vendor>): Promise<Vendor> => {
    const res = await api.post('/inventory/vendors', data);
    return res.data.data;
  },

  getCustomers: async (): Promise<Customer[]> => {
    const res = await api.get('/inventory/customers');
    return res.data.data;
  },

  createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
    const res = await api.post('/inventory/customers', data);
    return res.data.data;
  },

  getVehicles: async (customer_id?: string): Promise<CustomerVehicle[]> => {
    const res = await api.get('/inventory/vehicles', { params: { customer_id } });
    return res.data.data;
  },

  createVehicle: async (data: Partial<CustomerVehicle>): Promise<CustomerVehicle> => {
    const res = await api.post('/inventory/vehicles', data);
    return res.data.data;
  },

  getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
    const res = await api.get('/inventory/purchase-orders');
    return res.data.data;
  },

  createPurchaseOrder: async (data: any): Promise<PurchaseOrder> => {
    const res = await api.post('/inventory/purchase-orders', data);
    return res.data.data;
  },

  getInvoices: async (): Promise<Invoice[]> => {
    const res = await api.get('/inventory/invoices');
    return res.data.data;
  },

  createInvoice: async (data: any): Promise<Invoice> => {
    const res = await api.post('/inventory/invoices', data);
    return res.data.data;
  },

  getInstallations: async (): Promise<TrackerInstallation[]> => {
    const res = await api.get('/inventory/installations');
    return res.data.data;
  },

  createInstallation: async (data: any): Promise<TrackerInstallation> => {
    const res = await api.post('/inventory/installations', data);
    return res.data.data;
  },

  getComplaints: async (): Promise<CustomerComplaint[]> => {
    const res = await api.get('/inventory/complaints');
    return res.data.data;
  },

  createComplaint: async (data: any): Promise<CustomerComplaint> => {
    const res = await api.post('/inventory/complaints', data);
    return res.data.data;
  },

  createReplacement: async (data: any): Promise<any> => {
    const res = await api.post('/inventory/replacements', data);
    return res.data.data;
  },

  getDispatches: async (params?: Record<string, any>): Promise<FieldDispatch[]> => {
    const res = await api.get('/inventory/dispatches', { params });
    return res.data.data;
  },

  getDispatch: async (id: string): Promise<FieldDispatch> => {
    const res = await api.get(`/inventory/dispatches/${id}`);
    return res.data.data;
  },

  createDispatch: async (data: any): Promise<FieldDispatch> => {
    const res = await api.post('/inventory/dispatches', data);
    return res.data.data;
  },

  reconcileDispatch: async (id: string, data: any): Promise<FieldDispatch> => {
    const res = await api.post(`/inventory/dispatches/${id}/reconcile`, data);
    return res.data.data;
  },

  getCustomerInvoiceDraft: async (customer_id: string): Promise<CustomerInvoiceDraft> => {
    const res = await api.get(`/inventory/customers/${customer_id}/invoice-draft`);
    return res.data.data;
  },

  updateCustomerInvoiceDraft: async (customer_id: string, data: Partial<CustomerInvoiceDraft>): Promise<CustomerInvoiceDraft> => {
    const res = await api.put(`/inventory/customers/${customer_id}/invoice-draft`, data);
    return res.data.data;
  },

  generateDraftInvoiceFromTemplate: async (customer_id: string): Promise<Invoice> => {
    const res = await api.post(`/inventory/customers/${customer_id}/generate-draft-invoice`);
    return res.data.data;
  },
};

export interface CustomerInvoiceDraft {
  id: string;
  customer_id: string;
  customer_name?: string;
  payment_terms: string;
  default_discount_pct: number;
  custom_notes?: string;
  template_items: Array<{
    product_id?: string;
    product_name?: string;
    item_description?: string;
    quantity: number;
    unit_price: number;
  }>;
}

