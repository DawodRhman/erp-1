import { Router } from 'express'
import { z } from 'zod'
import leaveTypeController from '../controllers/leave-type-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveTypeSchema, updateLeaveTypeSchema } from '../schemas/leave-type.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), leaveTypeController.getAll)
router.get(
    '/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    leaveTypeController.getById
)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createLeaveTypeSchema), leaveTypeController.create)
router.put(
    '/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateLeaveTypeSchema,
    }),
    leaveTypeController.update
)

export default router
