import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import * as inventoryController from './inventory.controller.js';

const router = Router();

// Protect all inventory routes with Auth
router.use(verifyToken);

// Summary & Dashboards
router.get('/summary', requirePermission('inventory:read'), inventoryController.getSummary);
router.get('/work-queue', requirePermission('inventory:read'), inventoryController.getWorkQueue);
router.get('/movements', requirePermission('inventory:read'), inventoryController.getInventoryMovements);

// Categories
router.get('/categories', requirePermission('inventory:read'), inventoryController.getCategories);
router.post('/categories', requirePermission('inventory:admin'), inventoryController.createCategory);
router.patch('/categories/:id', requirePermission('inventory:admin'), inventoryController.updateCategory);
router.delete('/categories/:id', requirePermission('inventory:admin'), inventoryController.deleteCategory);

// Products
router.get('/products', requirePermission('inventory:read'), inventoryController.getProducts);
router.post('/products', requirePermission('inventory:write'), inventoryController.createProduct);
router.patch('/products/:id', requirePermission('inventory:write'), inventoryController.updateProduct);
router.delete('/products/:id', requirePermission('inventory:admin'), inventoryController.deleteProduct);

// Serials / Serials Items
router.get('/items', requirePermission('inventory:read'), inventoryController.getInventoryItems);
router.post('/items', requirePermission('inventory:write'), inventoryController.createInventoryItem);
router.patch('/items/:id', requirePermission('inventory:write'), inventoryController.updateInventoryItem);
router.delete('/items/:id', requirePermission('inventory:admin'), inventoryController.deleteInventoryItem);

// Vendors & Customers
router.get('/vendors', requirePermission('inventory:read'), inventoryController.getVendors);
router.post('/vendors', requirePermission('inventory:write'), inventoryController.createVendor);
router.get('/customers', requirePermission('inventory:read'), inventoryController.getCustomers);
router.post('/customers', requirePermission('inventory:write'), inventoryController.createCustomer);
router.get('/vehicles', requirePermission('inventory:read'), inventoryController.getCustomerVehicles);
router.post('/vehicles', requirePermission('inventory:write'), inventoryController.createCustomerVehicle);

// Purchase Orders & Invoices
router.get('/purchase-orders', requirePermission('inventory:read'), inventoryController.getPurchaseOrders);
router.post('/purchase-orders', requirePermission('inventory:write'), inventoryController.createPurchaseOrder);
router.get('/invoices', requirePermission('inventory:read'), inventoryController.getInvoices);
router.post('/invoices', requirePermission('inventory:write'), inventoryController.createInvoice);

// Tracker Installations & Complaints
router.get('/installations', requirePermission('inventory:read'), inventoryController.getInstallations);
router.post('/installations', requirePermission('inventory:write'), inventoryController.createInstallation);
router.get('/complaints', requirePermission('inventory:read'), inventoryController.getComplaints);
router.post('/complaints', requirePermission('inventory:write'), inventoryController.createComplaint);
router.post('/replacements', requirePermission('inventory:write'), inventoryController.createReplacement);

// Customer Special Invoice Draft Templates
router.get('/customers/:customer_id/invoice-draft', requirePermission('inventory:read'), inventoryController.getCustomerInvoiceDraft);
router.put('/customers/:customer_id/invoice-draft', requirePermission('inventory:write'), inventoryController.updateCustomerInvoiceDraft);
router.post('/customers/:customer_id/generate-draft-invoice', requirePermission('inventory:write'), inventoryController.generateDraftInvoiceFromTemplate);

// Installer Field Dispatches & Reconciliations
import * as logisticsController from './field-logistics.controller.js';
router.get('/dispatches', requirePermission('inventory:read'), logisticsController.listDispatches);
router.get('/dispatches/:id', requirePermission('inventory:read'), logisticsController.getDispatch);
router.post('/dispatches', requirePermission('inventory:write'), logisticsController.createDispatch);
router.post('/dispatches/:id/reconcile', requirePermission('inventory:write'), logisticsController.reconcileDispatch);

export default router;
