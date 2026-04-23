import { Router } from 'express'
import shiftController from '../controllers/shift-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createShiftSchema, updateShiftSchema } from '../schemas/shift.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), shiftController.getAll)
router.get('/:id', verifyToken, requireAnyPermission(['config:read', 'config:manage']), shiftController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createShiftSchema), shiftController.create)
router.put('/:id', verifyToken, requirePermission('config:manage'), validate(updateShiftSchema), shiftController.update)

export default router
