import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveRequestSchema, earlyReturnSchema } from '../schemas/leave-request.schema.js'
import {
    getLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    earlyReturnLeaveRequest,
    getLeaveBalances,
    getLeaveCalendar,
} from '../controllers/leave-request-controller.js'

const router = Router()

router.get('/', verifyToken, requirePermission('leave:read'), getLeaveRequests)
router.get('/balances', verifyToken, requirePermission('leave:read'), getLeaveBalances)
router.get('/calendar', verifyToken, requirePermission('leave:read'), getLeaveCalendar)
router.post('/', verifyToken, requirePermission('leave:write'), validate(createLeaveRequestSchema), createLeaveRequest)
router.patch('/:id/approve', verifyToken, requirePermission('leave:approve'), approveLeaveRequest)
router.patch('/:id/reject', verifyToken, requirePermission('leave:approve'), rejectLeaveRequest)
router.patch('/:id/early-return', verifyToken, requirePermission('leave:approve'), validate(earlyReturnSchema), earlyReturnLeaveRequest)

export default router
