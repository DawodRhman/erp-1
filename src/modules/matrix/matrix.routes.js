import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import * as matrixController from './matrix.controller.js';

const router = Router();

router.use(verifyToken);

// Phase 1: CRM & Sales
router.get('/leads', matrixController.getSalesLeads);
router.post('/leads', matrixController.createSalesLead);
router.get('/quotations', matrixController.getQuotations);
router.post('/quotations', matrixController.createQuotation);
router.post('/quotations/:quotation_id/activate-project', matrixController.activateProject);

// Phase 2: Operations & Projects & PR
router.get('/projects', matrixController.getProjects);
router.post('/projects/assign', matrixController.assignProjectResource);
router.get('/pr', matrixController.getPurchaseRequisitions);
router.post('/pr', matrixController.createPurchaseRequisition);

// Phase 3: Stock Out To Employee Assets
router.post('/stock-out/employee', matrixController.stockOutToEmployee);

// Phase 4: Field Tickets & Digital OTP Handshake
router.get('/tickets', matrixController.getServiceTickets);
router.post('/tickets', matrixController.createServiceTicket);
router.post('/tickets/:ticket_id/trigger-otp', matrixController.triggerOTP);
router.post('/tickets/verify-otp', matrixController.verifyOTP);

// Phase 5: Virtual Debt & Reconciliation & HR Resignation Recovery
router.get('/virtual-debts', matrixController.getVirtualDebts);
router.post('/virtual-debts/record-collection', matrixController.recordCashCollection);
router.post('/virtual-debts/:debt_id/reconcile', matrixController.reconcileDebt);
router.post('/employees/:employee_id/resignation-recovery', matrixController.processResignationRecovery);

export default router;
