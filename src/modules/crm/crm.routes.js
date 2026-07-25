import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
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
} from './crm.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/leads', listLeads);
router.post('/leads', createLead);
router.patch('/leads/:id', updateLead);

router.get('/quotations', listQuotations);
router.get('/quotations/:id', getQuotation);
router.post('/quotations', createQuotation);
router.patch('/quotations/:id/status', updateQuotationStatus);

router.get('/products/:productId/price-tiers', getProductPriceTiers);
router.post('/products/:productId/price-tiers', setProductPriceTiers);

export default router;
