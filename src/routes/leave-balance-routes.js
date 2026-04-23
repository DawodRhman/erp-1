import { Router } from 'express'
import leaveBalanceController from '../controllers/leave-balance-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { z } from 'zod'
import {
    adjustLeaveBalanceSchema,
    createLeaveBalanceSchema,
    initializeLeaveBalancesSchema,
    updateLeaveBalanceSchema,
} from '../schemas/leave-balance.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('leave:read'), leaveBalanceController.getAll)
router.get(
    '/year/:year',
    verifyToken,
    requirePermission('leave:read'),
    validate({ params: z.object({ year: z.string().regex(/^\d{4}$/) }) }),
    leaveBalanceController.getByYear
)
router.get(
    '/employee/:employeeId',
    verifyToken,
    requirePermission('leave:read'),
    validate({ params: z.object({ employeeId: z.string().min(1).max(10) }) }),
    leaveBalanceController.getByEmployee
)
router.get(
    '/:id',
    verifyToken,
    requirePermission('leave:read'),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    leaveBalanceController.getById
)
router.post('/', verifyToken, requirePermission('employees:write'), validate(createLeaveBalanceSchema), leaveBalanceController.create)
router.post(
    '/employee/:employeeId/initialize',
    verifyToken,
    requirePermission('employees:write'),
    validate({
        params: z.object({ employeeId: z.string().min(1).max(10) }),
        body: initializeLeaveBalancesSchema,
    }),
    leaveBalanceController.initializeForEmployee
)
router.put(
    '/:id',
    verifyToken,
    requirePermission('employees:write'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateLeaveBalanceSchema,
    }),
    leaveBalanceController.update
)
router.patch(
    '/:id/adjust',
    verifyToken,
    requirePermission('employees:write'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: adjustLeaveBalanceSchema,
    }),
    leaveBalanceController.adjustUsed
)

export default router
