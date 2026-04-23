import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { batchAttendanceSchema } from '../schemas/attendance.schema.js'
import {
    getDailySheet,
    batchSaveAttendance,
    getMonthlyReport,
    acknowledgeAttendance,
} from '../controllers/attendance-controller.js'

const router = Router()

router.get(
    '/daily',
    verifyToken,
    requirePermission('attendance:read'),
    validate({
        query: z.object({
            date: z.string().date(),
            department: z.string().uuid().optional(),
            location: z.string().uuid().optional(),
            shift: z.string().uuid().optional(),
            employee: z.string().min(1).max(10).optional(),
        }),
    }),
    getDailySheet
)
router.post('/batch', verifyToken, requirePermission('attendance:write'), validate(batchAttendanceSchema), batchSaveAttendance)
router.get(
    '/report',
    verifyToken,
    requirePermission('attendance:read'),
    validate({
        query: z.object({
            month: z.string().regex(/^(0?[1-9]|1[0-2])$/),
            year: z.string().regex(/^\d{4}$/),
            department: z.string().uuid().optional(),
        }),
    }),
    getMonthlyReport
)
router.patch(
    '/:attendanceId/ack',
    verifyToken,
    requirePermission('attendance:read'),
    validate({
        params: z.object({ attendanceId: z.string().uuid() }),
        body: z.object({}).strict(),
    }),
    acknowledgeAttendance
)

export default router
