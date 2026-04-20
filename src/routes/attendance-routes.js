import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { batchAttendanceSchema } from '../schemas/attendance.schema.js'
import {
    getDailySheet,
    batchSaveAttendance,
    getMonthlyReport,
} from '../controllers/attendance-controller.js'

const router = Router()

router.get('/daily', verifyToken, requirePermission('attendance:read'), getDailySheet)
router.post('/batch', verifyToken, requirePermission('attendance:write'), validate(batchAttendanceSchema), batchSaveAttendance)
router.get('/report', verifyToken, requirePermission('attendance:read'), getMonthlyReport)

export default router
