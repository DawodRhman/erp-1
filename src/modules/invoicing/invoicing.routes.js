import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import {
  listClientTemplates,
  saveClientTemplate,
  createClientInvoice,
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
} from './invoicing.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/templates', listClientTemplates);
router.post('/templates', saveClientTemplate);

router.get('/invoices', listInvoices);
router.get('/invoices/:id', getInvoice);
router.post('/invoices', createClientInvoice);
router.patch('/invoices/:id/status', updateInvoiceStatus);

export default router;
