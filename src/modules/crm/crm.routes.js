import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  listLeads,
  createLead,
  updateLead,
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotationStatus,
  setProductPriceTiers,
  getProductPriceTiers,
  listCustomers,
  listProducts,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './crm.controller.js';

const router = Router();

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
router.patch('/quotations/:id/status', requirePermission('crm:write'), updateQuotationStatus);

router.get('/products/:productId/price-tiers', requirePermission('crm:read'), getProductPriceTiers);
router.post('/products/:productId/price-tiers', requirePermission('crm:write'), setProductPriceTiers);

export default router;
