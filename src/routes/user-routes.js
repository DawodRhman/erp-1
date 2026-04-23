import { Router } from 'express'
import { z } from 'zod'
import userController from '../controllers/user-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createUserSchema, updateUserRoleSchema } from '../schemas/user.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), userController.getAll)
router.get(
    '/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    userController.getById
)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createUserSchema), userController.create)
router.patch(
    '/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateUserRoleSchema,
    }),
    userController.updateRole
)

export default router
