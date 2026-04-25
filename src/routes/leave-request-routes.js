import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import {
    createLeaveRequestSchema,
    earlyReturnSchema,
    leaveBalanceQuerySchema,
    leaveRequestListQuerySchema,
} from '../schemas/leave-request.schema.js'
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

router.get(
    '/',
    verifyToken,
    requirePermission('leave:read'),
    validate({ query: leaveRequestListQuerySchema }),
    getLeaveRequests
)
router.get(
    '/balances',
    verifyToken,
    requirePermission('leave:read'),
    validate({ query: leaveBalanceQuerySchema }),
    getLeaveBalances
)
router.get(
    '/calendar',
    verifyToken,
    requirePermission('leave:read'),
    validate({
        query: z.object({
            department: z.string().uuid().optional(),
            month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
            year: z.string().regex(/^\d{4}$/).optional(),
        }),
    }),
    getLeaveCalendar
)
router.post('/', verifyToken, requirePermission('leave:write'), validate(createLeaveRequestSchema), createLeaveRequest)
router.patch(
    '/:id/approve',
    verifyToken,
    requirePermission('leave:approve'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: z.object({}).strict(),
    }),
    approveLeaveRequest
)
router.patch(
    '/:id/reject',
    verifyToken,
    requirePermission('leave:approve'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: z.object({}).strict(),
    }),
    rejectLeaveRequest
)
router.patch('/:id/early-return', verifyToken, requirePermission('leave:approve'), validate(earlyReturnSchema), earlyReturnLeaveRequest)

export default router
