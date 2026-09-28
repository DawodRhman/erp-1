import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';
import {
  listLeads,
  createLead,
  updateLead,
  listQuotations,
  getQuotation,
  getPublicQuotation,
  approvePublicQuotation,
  rejectPublicQuotation,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  listOrders,
  listComplaints,
  createComplaint,
  listInvoices,
  getInvoice,
  convertQuotationToOrder,
  setProductPriceTiers,
  getProductPriceTiers,
  listCustomers,
  listProducts,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  sendQuotationEmail,
} from './crm.controller.js';

const router = Router();

router.get('/public/quotations/:token', getPublicQuotation);
router.post('/public/quotations/:token/approve', approvePublicQuotation);
router.post('/public/quotations/:token/reject', rejectPublicQuotation);

router.use(verifyToken);

router.get('/customers', requirePermission('crm:read'), listCustomers);
router.post('/customers', requirePermission('crm:write'), createCustomer);
router.patch('/customers/:id', requirePermission('crm:write'), updateCustomer);
router.delete('/customers/:id', requirePermission('crm:write'), deleteCustomer);
router.get('/products', requirePermission('crm:read'), listProducts);

router.get('/leads', requirePermission('crm:read'), listLeads);
router.post('/leads', requirePermission('crm:write'), createLead);
router.patch('/leads/:id', requirePermission('crm:write'), updateLead);

router.get('/quotations', requirePermission('crm:read'), listQuotations);
router.get('/quotations/:id', requirePermission('crm:read'), getQuotation);
router.post('/quotations', requirePermission('crm:write'), createQuotation);
router.put('/quotations/:id', requirePermission('crm:write'), updateQuotation);
router.patch('/quotations/:id/status', requirePermission('crm:write'), updateQuotationStatus);
router.post('/quotations/:id/convert-to-order', requirePermission('crm:write'), convertQuotationToOrder);
router.post('/quotations/:id/send-email', requirePermission('crm:write'), validateParams(z.object({ id: z.string().uuid() })), sendQuotationEmail);

router.get('/orders', requirePermission('crm:read'), listOrders);
router.get('/complaints', requirePermission('crm:read'), listComplaints);
router.post('/complaints', requirePermission('crm:write'), createComplaint);
router.get('/invoices', requirePermission('crm:read'), listInvoices);
router.get('/invoices/:id', requirePermission('crm:read'), getInvoice);

router.get('/products/:productId/price-tiers', requirePermission('crm:read'), getProductPriceTiers);
router.post('/products/:productId/price-tiers', requirePermission('crm:write'), setProductPriceTiers);

export default router;
