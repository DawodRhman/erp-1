import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission, requirePermission } from '../../middleware/require-permission.js';
import * as matrixController from './matrix.controller.js';

const router = Router();

router.use(verifyToken);

// Phase 1: CRM & Sales
router.get('/leads', requireAnyPermission('matrix:sales', 'crm:read'), matrixController.getSalesLeads);
router.post('/leads', requireAnyPermission('matrix:sales', 'crm:write'), matrixController.createSalesLead);
router.get('/quotations', requireAnyPermission('matrix:sales', 'crm:read'), matrixController.getQuotations);
router.post('/quotations', requireAnyPermission('matrix:sales', 'crm:write'), matrixController.createQuotation);
router.post('/quotations/:quotation_id/activate-project', requireAnyPermission('matrix:sales', 'crm:write'), matrixController.activateProject);

// Phase 2: Operations & Projects & PR
router.get('/projects', requirePermission('matrix:operations'), matrixController.getProjects);
router.post('/projects/assign', requirePermission('matrix:operations'), matrixController.assignProjectResource);
router.get('/pr', requirePermission('matrix:operations'), matrixController.getPurchaseRequisitions);
router.post('/pr', requirePermission('matrix:operations'), matrixController.createPurchaseRequisition);

// Phase 3: Stock Out To Employee Assets
router.post('/stock-out/employee', requirePermission('matrix:operations'), matrixController.stockOutToEmployee);

// Phase 4: Field Tickets & Digital OTP Handshake
const requireFieldService = requireAnyPermission('matrix:field_service', 'matrix:operations');
router.get('/tickets', requireFieldService, matrixController.getServiceTickets);
router.post('/tickets', requireFieldService, matrixController.createServiceTicket);
router.post('/tickets/:ticket_id/trigger-otp', requireFieldService, matrixController.triggerOTP);
router.post('/tickets/verify-otp', requireFieldService, matrixController.verifyOTP);

// Phase 5: Virtual Debt & Reconciliation & HR Resignation Recovery
router.get('/virtual-debts', requirePermission('matrix:finance'), matrixController.getVirtualDebts);
router.post('/virtual-debts/record-collection', requirePermission('matrix:finance'), matrixController.recordCashCollection);
router.post('/virtual-debts/:debt_id/reconcile', requirePermission('matrix:finance'), matrixController.reconcileDebt);
router.post('/employees/:employee_id/resignation-recovery', requirePermission('matrix:finance'), matrixController.processResignationRecovery);

export default router;
