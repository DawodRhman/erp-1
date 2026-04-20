import { Router } from 'express'
import leaveBalanceController from '../controllers/leave-balance-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveBalanceSchema, updateLeaveBalanceSchema } from '../schemas/leave-balance.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('leave:read'), leaveBalanceController.getAll)
router.get('/year/:year', verifyToken, requirePermission('leave:read'), leaveBalanceController.getByYear)
router.get('/employee/:employeeId', verifyToken, requirePermission('leave:read'), leaveBalanceController.getByEmployee)
router.get('/:id', verifyToken, requirePermission('leave:read'), leaveBalanceController.getById)
router.post('/', verifyToken, requirePermission('employees:write'), validate(createLeaveBalanceSchema), leaveBalanceController.create)
router.post('/employee/:employeeId/initialize', verifyToken, requirePermission('employees:write'), leaveBalanceController.initializeForEmployee)
router.put('/:id', verifyToken, requirePermission('employees:write'), validate(updateLeaveBalanceSchema), leaveBalanceController.update)
router.patch('/:id/adjust', verifyToken, requirePermission('employees:write'), leaveBalanceController.adjustUsed)

export default router
