import { Router } from 'express'
import leavePolicyController from '../controllers/leave-policy-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeavePolicySchema, updateLeavePolicySchema } from '../schemas/leave-policy.schema.js'

const router = Router()

router.get('/', verifyToken, leavePolicyController.getAll)
router.get('/year/:year', verifyToken, leavePolicyController.getByYear)
router.get('/:id', verifyToken, leavePolicyController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createLeavePolicySchema), leavePolicyController.create)
router.put('/:id', verifyToken, requirePermission('config:manage'), validate(updateLeavePolicySchema), leavePolicyController.update)

export default router
