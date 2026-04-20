import { Router } from 'express'
import userController from '../controllers/user-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createUserSchema, updateUserRoleSchema } from '../schemas/user.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('config:manage'), userController.getAll)
router.get('/:id', verifyToken, requirePermission('config:manage'), userController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createUserSchema), userController.create)
router.patch('/:id', verifyToken, requirePermission('config:manage'), validate(updateUserRoleSchema), userController.updateRole)

export default router
