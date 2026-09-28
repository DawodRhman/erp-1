import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/require-permission.js';
import {
  listClientTemplates,
  saveClientTemplate,
  createClientInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  updateInvoiceStatus,
  listSummaries,
  createSummary,
} from './invoicing.controller.js';

const router = Router();

router.use(verifyToken);

const requireFinanceRead = requireAnyPermission('accounts:read', 'matrix:finance');
const requireFinanceWrite = requireAnyPermission('accounts:write', 'matrix:finance');

router.get('/templates', requireFinanceRead, listClientTemplates);
router.post('/templates', requireFinanceWrite, saveClientTemplate);

router.get('/invoices', requireFinanceRead, listInvoices);
router.get('/invoices/:id', requireFinanceRead, getInvoice);
router.post('/invoices', requireFinanceWrite, createClientInvoice);
router.put('/invoices/:id', requireFinanceWrite, updateInvoice);
router.patch('/invoices/:id/status', requireFinanceWrite, updateInvoiceStatus);

router.get('/summaries', requireFinanceRead, listSummaries);
router.post('/summaries', requireFinanceWrite, createSummary);

export default router;
