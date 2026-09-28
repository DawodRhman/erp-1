import { apiClient as api } from './apiClient';

export interface InventorySummary {
  total_products: number;
  total_stock_qty?: number;
  available_stock_qty?: number;
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
  pending_incoming_orders?: number;
  active_tokens?: number;
  active_dispatches?: number;
  pending_returns?: number;
  pending_bills?: number;
  sent_csr_quotes?: number;
  period_stock_in_qty?: number;
  period_stock_out_qty?: number;
  period_return_qty?: number;
  period_movement_count?: number;
  summary_period?: string;
  period_start?: string;
  period_end?: string;
}

export interface InventoryWorkQueueItem {
  id?: string;
  product_id?: string;
  vendor_id?: string;
  supplier_id?: string;
  vendor_name?: string;
  supplier_name?: string;
  product_name: string;
  description?: string;
  required_qty: number;
  unit_price: number;
  available_stock: number;
  serial_tracking?: boolean;
  stock_ok: boolean;
}

export interface InventoryWorkQueueJob {
  id: string;
  order_id?: string;
  order_number?: string;
  token_number?: string;
  quotation_number: string;
  customer_id?: string;
  customer_name?: string;
  price_tier?: string;
  template_style?: string;
  status: string;
  order_status?: string;
  stock_status?: string;
  quotation_status?: string;
  total_amount: number;
  item_count: number;
  total_requested_qty: number;
  created_at: string;
  updated_at?: string;
  items?: InventoryWorkQueueItem[];
}

export interface InventoryToken {
  id: string;
  order_number: string;
  token_number: string;
  quotation_number?: string;
  customer_name?: string;
  item_count: number;
  total_amount: number;
  status: string;
  order_status?: string;
  created_at: string;
  updated_at?: string;
  already_generated?: boolean;
}

export interface InventoryInstallerUser {
  id: string;
  email: string;
  employee_id?: string;
  display_name?: string;
  role_name?: string;
  designation_title?: string;
  is_active?: boolean;
  phone?: string;
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
  sub_category?: string;
  brand_make?: string;
  condition?: 'NEW' | 'USED' | 'REFURBISHED' | string;
  sku?: string;
  model_no?: string;
  vendor_id?: string;
  supplier_id?: string;
  vendor_name?: string;
  supplier_name?: string;
  product_type: 'ASSET' | 'CONSUMABLE' | 'SERVICE';
  tracking_type: 'SERIAL' | 'IMEI' | 'NONE';
  quantity: number;
  min_stock_level: number;
  unit_price: number;
  selling_price?: number;
  cost_price: number;
  country_of_origin?: string;
  batch_lot_number?: string;
  expiry_date?: string;
  warranty_date?: string;
  product_image_url?: string;
  warehouse_location?: string;
  room_number?: string;
  rack_number?: string;
  custom_attributes?: Record<string, any>;
  price_tiers?: Record<string, number | string>;
  description?: string;
  available_count?: number;
  allocated_count?: number;
  installed_count?: number;
  damaged_count?: number;
  serials?: InventoryItem[];
  movements?: InventoryMovement[];
}

export interface ProductInput extends Partial<Product> {
  initial_quantity?: number;
  serial_numbers?: string[];
}

export interface ProductImageUpload {
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
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
  vendor_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  ntn_number?: string;
  gst_number?: string;
  payment_terms?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  notes?: string;
}

export interface ProductCustomFieldDefinition {
  id: string;
  field_key: string;
  label: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN' | string;
  applies_to: 'PRODUCT' | 'PURCHASE' | 'STOCK_IN' | string;
  required: boolean;
  options?: string[];
  active?: boolean;
  sort_order?: number;
}

export interface Customer {
  id: string;
  customer_name: string;
  company_name?: string;
  customer_category?: string;
  organization_type?: string;
  service_categories?: string[];
  service_description?: string;
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
  crm_order_id?: string;
  quotation_id?: string;
  order_number?: string;
  quotation_number?: string;
  customer_name?: string;
  status: string;
  subtotal_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  order_date: string;
  created_at?: string;
  expected_delivery_date?: string;
  warehouse_location?: string;
  room_number?: string;
  rack_number?: string;
  notes?: string;
  item_count?: number;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  product_id?: string;
  quotation_item_id?: string;
  product_name?: string;
  quantity: number;
  received_quantity?: number;
  unit_price: number;
  total_price?: number;
  remarks?: string;
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
  order_number?: string;
  token_number?: string;
  customer_id?: string;
  customer_name?: string;
  installer_id?: string;
  installer_name?: string;
  installer_email?: string;
  site_address?: string;
  status: string;
  notes?: string;
  dispatched_at?: string;
  completed_at?: string;
  client_signoff_at?: string;
  client_signoff_name?: string;
  client_signoff_note?: string;
  created_at?: string;
  item_count?: number;
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
  qr_token?: string;
  qr_payload?: string;
}

export interface FieldMaterialRequest {
  id: string;
  request_number: string;
  dispatch_id: string;
  dispatch_number?: string;
  customer_name?: string;
  product_id?: string;
  product_name?: string;
  item_description: string;
  requested_quantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED' | string;
  review_note?: string;
  created_at?: string;
}

export interface FieldPurchase {
  id?: string;
  item_description: string;
  vendor_name?: string;
  amount: number;
  receipt_url?: string;
  notes?: string;
}

export interface ReturnRequestItem extends FieldDispatchItem {
  condition?: 'GOOD' | 'DAMAGED' | 'CONSUMABLE_USED';
  confirm?: boolean;
  confirmed?: boolean;
  line_issued_amount?: number;
  line_return_amount?: number;
}

export interface ReturnBillAdjustment {
  original_installed_amount: number;
  returned_deduction_amount: number;
  extra_added_amount: number;
  final_adjusted_total: number;
}

export interface ReturnRequest {
  id: string;
  return_request_no: string;
  dispatch_number: string;
  order_number?: string;
  token_number?: string;
  quotation_id?: string;
  quotation_number?: string;
  customer_id?: string;
  customer_name?: string;
  installer_id?: string;
  installer_name?: string;
  installer_email?: string;
  client_signoff_at?: string;
  client_signoff_name?: string;
  client_signoff_note?: string;
  items_to_return_count?: number;
  dispatch_status?: string;
  status: 'PENDING' | 'CONFIRMED' | 'STOCK_UPDATED' | string;
  submitted_date?: string;
  created_at?: string;
  updated_at?: string;
  items?: ReturnRequestItem[];
  on_the_go_purchases?: FieldPurchase[];
  bill_adjustment?: ReturnBillAdjustment;
  invoice?: any;
  no_charge?: boolean;
  finance_handoff_status?: 'NOT_REQUIRED' | string;
  message?: string;
}

export const inventoryApi = {
  getSummary: async (params?: { period?: 'daily' | 'weekly' | 'monthly' }): Promise<InventorySummary> => {
    const res = await api.get('/inventory/summary', { params });
    return res.data.data;
  },

  getWorkQueue: async (params?: Record<string, any>): Promise<InventoryWorkQueueJob[]> => {
    const res = await api.get('/inventory/work-queue', { params });
    return res.data.data;
  },

  getTokens: async (): Promise<InventoryToken[]> => {
    const res = await api.get('/inventory/tokens');
    return res.data.data;
  },

  getInstallers: async (params?: { includeInactive?: boolean }): Promise<InventoryInstallerUser[]> => {
    const res = await api.get('/inventory/installers', { params });
    return res.data.data;
  },

  updateInstallerStatus: async (id: string, is_active: boolean): Promise<InventoryInstallerUser> => {
    const res = await api.patch(`/inventory/installers/${id}/status`, { is_active });
    return res.data.data;
  },

  getMasterSettings: async (): Promise<InventoryMasterSettings> => {
    const res = await api.get('/inventory/master-settings');
    return res.data.data;
  },

  updateCompanySettings: async (data: InventoryCompanySettings): Promise<InventoryCompanySettings> => {
    const res = await api.put('/inventory/master-settings/company', data);
    return res.data.data;
  },

  updateInventorySettings: async (data: InventoryPreferenceSettings): Promise<InventoryPreferenceSettings> => {
    const res = await api.put('/inventory/master-settings/inventory', data);
    return res.data.data;
  },

  generateOrderToken: async (orderId: string): Promise<InventoryToken> => {
    const res = await api.post(`/inventory/orders/${orderId}/token`);
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

  updateCategory: async (id: string, data: Partial<ItemCategory>): Promise<ItemCategory> => {
    const res = await api.patch(`/inventory/categories/${id}`, data);
    return res.data.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/inventory/categories/${id}`);
  },

  getProducts: async (params?: Record<string, any>): Promise<Product[]> => {
    const res = await api.get('/inventory/products', { params });
    return res.data.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const res = await api.get(`/inventory/products/${id}`);
    return res.data.data;
  },

  getProductCustomFields: async (): Promise<ProductCustomFieldDefinition[]> => {
    const res = await api.get('/inventory/custom-fields/products');
    return res.data.data;
  },

  upsertProductCustomField: async (data: Partial<ProductCustomFieldDefinition>): Promise<ProductCustomFieldDefinition> => {
    const res = await api.post('/inventory/custom-fields/products', data);
    return res.data.data;
  },

  deleteProductCustomField: async (id: string): Promise<void> => {
    await api.delete(`/inventory/custom-fields/products/${id}`);
  },

  createProduct: async (data: ProductInput): Promise<Product> => {
    const res = await api.post('/inventory/products', data);
    return res.data.data;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const res = await api.patch(`/inventory/products/${id}`, data);
    return res.data.data;
  },

  uploadProductImage: async (file: File): Promise<ProductImageUpload> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/inventory/product-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  confirmReturnedItemGoodCondition: async (id: string): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/items/${id}/confirm-return`);
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

  updateVendor: async (id: string, data: Partial<Vendor>): Promise<Vendor> => {
    const res = await api.patch(`/inventory/vendors/${id}`, data);
    return res.data.data;
  },

  deleteVendor: async (id: string): Promise<void> => {
    await api.delete(`/inventory/vendors/${id}`);
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

  receivePurchaseOrder: async (id: string, data: { items: Array<{ id: string; received_qty: number }> }): Promise<PurchaseOrder> => {
    const res = await api.post(`/inventory/purchase-orders/${id}/receive`, data);
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

  getMaterialRequests: async (params?: Record<string, any>): Promise<FieldMaterialRequest[]> => {
    const res = await api.get('/inventory/material-requests', { params });
    return res.data.data;
  },

  createMaterialRequest: async (dispatchId: string, data: Partial<FieldMaterialRequest>): Promise<FieldMaterialRequest> => {
    const res = await api.post(`/inventory/dispatches/${dispatchId}/material-requests`, data);
    return res.data.data;
  },

  reviewMaterialRequest: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; review_note?: string }): Promise<FieldMaterialRequest> => {
    const res = await api.patch(`/inventory/material-requests/${id}`, data);
    return res.data.data;
  },

  issueMaterialRequest: async (id: string): Promise<FieldMaterialRequest> => {
    const res = await api.post(`/inventory/material-requests/${id}/issue`);
    return res.data.data;
  },

  reconcileDispatch: async (id: string, data: any): Promise<FieldDispatch> => {
    const res = await api.post(`/inventory/dispatches/${id}/reconcile`, data);
    return res.data.data;
  },

  getReturnRequests: async (params?: Record<string, any>): Promise<ReturnRequest[]> => {
    const res = await api.get('/inventory/returns', { params });
    return res.data.data;
  },

  getReturnRequest: async (id: string): Promise<ReturnRequest> => {
    const res = await api.get(`/inventory/returns/${id}`);
    return res.data.data;
  },

  confirmReturnRequest: async (id: string, data: any): Promise<ReturnRequest> => {
    const res = await api.post(`/inventory/returns/${id}/confirm`, data);
    return res.data.data;
  },

  sendAdjustedBillToFinance: async (id: string): Promise<ReturnRequest> => {
    const res = await api.post(`/inventory/returns/${id}/send-bill`);
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

export interface InventoryCompanySettings {
  company_name: string;
  ntn_number: string;
  gst_number: string;
  address: string;
  phone: string;
  bank_account_number: string;
}

export interface InventoryPreferenceSettings {
  default_min_stock_threshold: number;
  low_stock_alert_email: string;
  theme_preset: 'executive' | 'ocean' | 'emerald' | 'graphite' | 'custom' | string;
  primary_color: string;
  accent_color: string;
  page_color: string;
  surface_color: string;
}

export interface InventoryMasterSettings {
  company: InventoryCompanySettings;
  inventory: InventoryPreferenceSettings;
}

