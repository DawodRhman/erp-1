import { Router } from 'express'
import { z } from 'zod'
import leaveTypeController from '../controllers/leave-type-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveTypeSchema, updateLeaveTypeSchema } from '../schemas/leave-type.schema.js'

const router = Router()

// Employees need read-only access to leave types to submit leave requests.
// Keep management super_admin-only via config:manage on write routes.
router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage', 'leave:read']), leaveTypeController.getAll)
router.get(
    '/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage', 'leave:read']),
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
