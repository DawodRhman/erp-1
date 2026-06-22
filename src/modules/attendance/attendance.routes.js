import { Router } from 'express';
import { z } from 'zod';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission, requirePermission } from '../../middleware/require-permission.js';
import { validate, validateParams } from '../../middleware/validate.js';
import {
  getAttendanceSheet,
  saveAttendanceSheet,
  submitSheetToHO,
  requestUnlock,
  approveUnlock,
  acknowledgeAttendance,
  submitAttendanceCorrectionRequest,
  getAttendanceCorrectionRequests,
  reviewAttendanceCorrectionRequest,
  getMonthlyReport,
} from './attendance.controller.js';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const saveSheetSchema = z.object({
  date: z.string().min(8),
  location_id: z.string().uuid(),
  rows: z.array(
    z.object({
      employee_id: z.string().min(3).max(10),
      shift_id: z.string().uuid(),
      check_in: z.string().optional().nullable(),
      check_out: z.string().optional().nullable(),
      status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']),
      notes: z.string().optional().nullable(),
      ack: z.boolean().nullable().optional(),
    })
  ),
});

const submitSchema = z.object({
  date: z.string().min(8),
  location_id: z.string().uuid(),
});

const requestUnlockSchema = z.object({
  date: z.string().min(8),
  location_id: z.string().uuid(),
  reason: z.string().min(3),
});

const approveUnlockSchema = z.object({
  date: z.string().min(8),
  location_id: z.string().uuid(),
  unlock_reason: z.string().min(3),
});

const correctionRequestSchema = z.object({
  date: z.string().min(8),
  requested_check_in: z.string().optional().nullable(),
  requested_check_out: z.string().optional().nullable(),
  reason: z.string().min(3).max(1000),
}).refine(
  (value) => value.requested_check_in || value.requested_check_out,
  {
    message: 'At least one correction time is mandatory.',
    path: ['requested_check_in'],
  }
);

const correctionReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  review_note: z.string().max(1000).optional().nullable(),
});

router.use(verifyToken);

router.get('/', requireAnyPermission('attendance:read', 'attendance:department_read'), getAttendanceSheet);
router.put('/save', requirePermission('attendance:write'), validate(saveSheetSchema), saveAttendanceSheet);
router.post('/submit', requirePermission('attendance:submit_ho'), validate(submitSchema), submitSheetToHO);
router.post(
  '/unlock-request',
  requirePermission('attendance:write'),
  validate(requestUnlockSchema),
  requestUnlock
);
router.post(
  '/unlock-approve',
  requirePermission('attendance:unlock'),
  validate(approveUnlockSchema),
  approveUnlock
);
router.patch('/:id/ack', validateParams(uuidParamSchema), acknowledgeAttendance);
router.post('/corrections', validate(correctionRequestSchema), submitAttendanceCorrectionRequest);
router.get(
  '/corrections',
  requireAnyPermission('attendance:read', 'attendance:department_read'),
  getAttendanceCorrectionRequests
);
router.patch(
  '/corrections/:id/review',
  requirePermission('attendance:write'),
  validateParams(uuidParamSchema),
  validate(correctionReviewSchema),
  reviewAttendanceCorrectionRequest
);
router.get('/report', requireAnyPermission('attendance:read', 'attendance:department_read'), getMonthlyReport);

export default router;
