import { Router } from 'express';
import { z } from 'zod';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission, requirePermission } from '../../middleware/require-permission.js';
import { validate, validateParams } from '../../middleware/validate.js';
import {
  getLeaveRequests,
  getMyLeaveRequests,
  submitLeaveRequest,
  approveLeave,
  rejectLeave,
  earlyReturn,
  getLeaveBalances,
  getLeaveBalanceSummary,
  getMyLeaveBalances,
  initializeYearlyLeaveBalances,
  getLeaveCalendar,
} from './leave.controller.js';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const submitLeaveSchema = z.object({
  leave_type_id: z.string().uuid(),
  start_date: z.string().min(8),
  end_date: z.string().min(8),
  reason: z.string().optional().nullable(),
});

const rejectSchema = z.object({
  reason: z.string().min(2),
});

const initializeYearSchema = z.object({
  year: z.number().int().min(2020).max(2100),
});

router.use(verifyToken);

router.get('/', requireAnyPermission('leave:read', 'leave:department_read'), getLeaveRequests);
router.get('/mine', getMyLeaveRequests);
router.post('/', requirePermission('leave:write'), validate(submitLeaveSchema), submitLeaveRequest);
router.patch('/:id/approve', requireAnyPermission('leave:approve', 'leave:department_approve'), validateParams(uuidParamSchema), approveLeave);
router.patch(
  '/:id/reject',
  requireAnyPermission('leave:approve', 'leave:department_approve'),
  validateParams(uuidParamSchema),
  validate(rejectSchema),
  rejectLeave
);
router.patch('/:id/early-return', requirePermission('leave:approve'), validateParams(uuidParamSchema), earlyReturn);
router.get('/balances/summary', requireAnyPermission('leave:read', 'leave:department_read'), getLeaveBalanceSummary);
router.get('/balances', requireAnyPermission('leave:read', 'leave:department_read'), getLeaveBalances);
router.get('/balances/mine', getMyLeaveBalances);
router.post(
  '/balances/initialize-year',
  requirePermission('leave:approve'),
  validate(initializeYearSchema),
  initializeYearlyLeaveBalances
);
router.get('/calendar', requireAnyPermission('leave:read', 'leave:department_read'), getLeaveCalendar);

export default router;
