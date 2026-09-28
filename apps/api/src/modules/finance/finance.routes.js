import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/require-permission.js';
import * as financeController from './finance.controller.js';

const router = Router();

router.use(verifyToken);

const requireFinanceRead = requireAnyPermission('accounts:read', 'matrix:finance');
const requireFinanceWrite = requireAnyPermission('accounts:write', 'matrix:finance');

router.get('/meta', requireFinanceRead, financeController.getCompanyDetails);
router.get('/dashboard', requireFinanceRead, financeController.getDashboard);

router.get('/billing-approvals', requireFinanceRead, financeController.listBillingApprovals);
router.get('/billing-approvals/:id', requireFinanceRead, financeController.getBillingApproval);
router.post('/billing-approvals/:id/approve', requireFinanceWrite, financeController.approveBillingApproval);
router.post('/billing-approvals/:id/reject', requireFinanceWrite, financeController.rejectBillingApproval);

router.get('/customers', requireFinanceRead, financeController.listCustomers);
router.get('/invoices', requireFinanceRead, financeController.listInvoices);
router.post('/invoices', requireFinanceWrite, financeController.createInvoice);
router.get('/invoices/:id', requireFinanceRead, financeController.getInvoice);
router.put('/invoices/:id', requireFinanceWrite, financeController.updateInvoice);
router.delete('/invoices/:id', requireFinanceWrite, financeController.deleteInvoice);

router.get('/summaries', requireFinanceRead, financeController.getSummaries);
router.get('/accounts', requireFinanceRead, financeController.getAccounts);

export default router;
