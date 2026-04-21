import { Router } from 'express'
import leaveTypeController from '../controllers/leave-type-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveTypeSchema, updateLeaveTypeSchema } from '../schemas/leave-type.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('config:manage'), leaveTypeController.getAll)
router.get('/:id', verifyToken, requirePermission('config:manage'), leaveTypeController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createLeaveTypeSchema), leaveTypeController.create)
router.put('/:id', verifyToken, requirePermission('config:manage'), validate(updateLeaveTypeSchema), leaveTypeController.update)

export default router
