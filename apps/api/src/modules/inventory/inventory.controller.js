import { sendSuccess } from '../../utils/respond.js';
import * as inventoryService from './inventory.service.js';
import { subscribeToInventoryEvents } from './inventory-events.js';

export function streamInventoryEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const writeEvent = (event) => {
    res.write(`id: ${event.id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  const unsubscribe = subscribeToInventoryEvents(writeEvent);
  const heartbeat = setInterval(() => res.write(': inventory-heartbeat\n\n'), 25000);

  writeEvent({
    id: `connected-${Date.now()}`,
    type: 'connected',
    payload: {},
    occurred_at: new Date().toISOString(),
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
}

export async function getSummary(req, res, next) {
  try {
    const summary = await inventoryService.getInventorySummary(req.query);
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

export async function getWorkQueue(req, res, next) {
  try {
    const queue = await inventoryService.getInventoryWorkQueue(req.query);
    sendSuccess(res, queue);
  } catch (error) {
    next(error);
  }
}

export async function getInventoryMovements(req, res, next) {
  try {
    const movements = await inventoryService.getInventoryMovements(req.query);
    sendSuccess(res, movements);
  } catch (error) {
    next(error);
  }
}

export async function generateOrderToken(req, res, next) {
  try {
    const token = await inventoryService.generateOrderToken(req.params.orderId, req.user?.user_id);
    sendSuccess(res, token);
  } catch (error) {
    next(error);
  }
}

export async function getInventoryTokens(req, res, next) {
  try {
    const tokens = await inventoryService.getInventoryTokens();
    sendSuccess(res, tokens);
  } catch (error) {
    next(error);
  }
}

export async function getInventoryInstallers(req, res, next) {
  try {
    const installers = await inventoryService.getInventoryInstallers({ includeInactive: req.query.includeInactive });
    sendSuccess(res, installers);
  } catch (error) {
    next(error);
  }
}

export async function getMasterSettings(req, res, next) {
  try {
    const settings = await inventoryService.getMasterSettings();
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateCompanySettings(req, res, next) {
  try {
    const settings = await inventoryService.updateCompanySettings(req.body, req.user?.user_id);
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateInventorySettings(req, res, next) {
  try {
    const settings = await inventoryService.updateInventorySettings(req.body, req.user?.user_id);
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateInstallerStatus(req, res, next) {
  try {
    const installer = await inventoryService.updateInstallerStatus(req.params.id, req.body);
    sendSuccess(res, installer);
  } catch (error) {
    next(error);
  }
}

export async function getProductCustomFields(req, res, next) {
  try {
    const fields = await inventoryService.listProductCustomFieldDefinitions();
    sendSuccess(res, fields);
  } catch (error) {
    next(error);
  }
}

export async function upsertProductCustomField(req, res, next) {
  try {
    const field = await inventoryService.upsertProductCustomFieldDefinition(req.body, req.user?.user_id);
    sendSuccess(res, field, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteProductCustomField(req, res, next) {
  try {
    const result = await inventoryService.deleteProductCustomFieldDefinition(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// Categories
export async function getCategories(req, res, next) {
  try {
    const categories = await inventoryService.getCategories();
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await inventoryService.createCategory(req.body);
    sendSuccess(res, category, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await inventoryService.updateCategory(req.params.id, req.body);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const result = await inventoryService.deleteCategory(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// Products
export async function getProducts(req, res, next) {
  try {
    const products = await inventoryService.getProducts(req.query);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await inventoryService.getProductById(req.params.id);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await inventoryService.createProduct(req.body, req.user?.user_id);
    sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await inventoryService.updateProduct(req.params.id, req.body);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const result = await inventoryService.deleteProduct(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// Serials / Items
export async function getInventoryItems(req, res, next) {
  try {
    const items = await inventoryService.getInventoryItems(req.query);
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createInventoryItem(req, res, next) {
  try {
    const item = await inventoryService.createInventoryItem(req.body, req.user?.user_id);
    sendSuccess(res, item, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryItem(req, res, next) {
  try {
    const item = await inventoryService.updateInventoryItem(req.params.id, req.body, req.user?.user_id);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function confirmReturnedInventoryItem(req, res, next) {
  try {
    const item = await inventoryService.confirmReturnedInventoryItem(req.params.id, req.user?.user_id);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function deleteInventoryItem(req, res, next) {
  try {
    const result = await inventoryService.deleteInventoryItem(req.params.id, req.user?.user_id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// Vendors & Customers
export async function getVendors(req, res, next) {
  try {
    const vendors = await inventoryService.getVendors();
    sendSuccess(res, vendors);
  } catch (error) {
    next(error);
  }
}

export async function createVendor(req, res, next) {
  try {
    const vendor = await inventoryService.createVendor(req.body);
    sendSuccess(res, vendor, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateVendor(req, res, next) {
  try {
    const vendor = await inventoryService.updateVendor(req.params.id, req.body);
    sendSuccess(res, vendor);
  } catch (error) {
    next(error);
  }
}

export async function deleteVendor(req, res, next) {
  try {
    const result = await inventoryService.deleteVendor(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getCustomers(req, res, next) {
  try {
    const customers = await inventoryService.getCustomers();
    sendSuccess(res, customers);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await inventoryService.createCustomer(req.body, req.user?.user_id || req.user?.id);
    sendSuccess(res, customer, 201);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerVehicles(req, res, next) {
  try {
    const vehicles = await inventoryService.getCustomerVehicles(req.query.customer_id);
    sendSuccess(res, vehicles);
  } catch (error) {
    next(error);
  }
}

export async function createCustomerVehicle(req, res, next) {
  try {
    const vehicle = await inventoryService.createCustomerVehicle(req.body);
    sendSuccess(res, vehicle, 201);
  } catch (error) {
    next(error);
  }
}

// PO & Invoices
export async function getPurchaseOrders(req, res, next) {
  try {
    const pos = await inventoryService.getPurchaseOrders();
    sendSuccess(res, pos);
  } catch (error) {
    next(error);
  }
}

export async function createPurchaseOrder(req, res, next) {
  try {
    const po = await inventoryService.createPurchaseOrder(req.body, req.user?.user_id);
    sendSuccess(res, po, 201);
  } catch (error) {
    next(error);
  }
}

export async function receivePurchaseOrder(req, res, next) {
  try {
    const po = await inventoryService.receivePurchaseOrder(req.params.id, req.body, req.user?.user_id);
    sendSuccess(res, po);
  } catch (error) {
    next(error);
  }
}

export async function getInvoices(req, res, next) {
  try {
    const invoices = await inventoryService.getInvoices();
    sendSuccess(res, invoices);
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req, res, next) {
  try {
    const invoice = await inventoryService.createInvoice(req.body, req.user?.user_id);
    sendSuccess(res, invoice, 201);
  } catch (error) {
    next(error);
  }
}

// Trackers & Complaints
export async function getInstallations(req, res, next) {
  try {
    const installations = await inventoryService.getInstallations();
    sendSuccess(res, installations);
  } catch (error) {
    next(error);
  }
}

export async function createInstallation(req, res, next) {
  try {
    const installation = await inventoryService.createInstallation(req.body, req.user?.user_id);
    sendSuccess(res, installation, 201);
  } catch (error) {
    next(error);
  }
}

export async function getComplaints(req, res, next) {
  try {
    const complaints = await inventoryService.getComplaints();
    sendSuccess(res, complaints);
  } catch (error) {
    next(error);
  }
}

export async function createComplaint(req, res, next) {
  try {
    const complaint = await inventoryService.createComplaint(req.body);
    sendSuccess(res, complaint, 201);
  } catch (error) {
    next(error);
  }
}

export async function createReplacement(req, res, next) {
  try {
    const replacement = await inventoryService.createReplacement(req.body, req.user?.user_id);
    sendSuccess(res, replacement, 201);
  } catch (error) {
    next(error);
  }
}

// Customer Special Invoice Draft Templates
export async function getCustomerInvoiceDraft(req, res, next) {
  try {
    const draft = await inventoryService.getCustomerInvoiceDraft(req.params.customer_id);
    sendSuccess(res, draft);
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerInvoiceDraft(req, res, next) {
  try {
    const draft = await inventoryService.upsertCustomerInvoiceDraft(req.params.customer_id, req.body);
    sendSuccess(res, draft);
  } catch (error) {
    next(error);
  }
}

export async function generateDraftInvoiceFromTemplate(req, res, next) {
  try {
    const invoice = await inventoryService.generateDraftInvoiceFromCustomerTemplate(req.params.customer_id);
    sendSuccess(res, invoice, 201);
  } catch (error) {
    next(error);
  }
}

