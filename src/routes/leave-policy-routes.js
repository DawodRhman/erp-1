import { Router } from 'express'
import { z } from 'zod'
import leavePolicyController from '../controllers/leave-policy-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeavePolicySchema, updateLeavePolicySchema } from '../schemas/leave-policy.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), leavePolicyController.getAll)
router.get(
    '/year/:year',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ year: z.string().regex(/^\d{4}$/) }) }),
    leavePolicyController.getByYear
)
router.get(
    '/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    leavePolicyController.getById
)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createLeavePolicySchema), leavePolicyController.create)
router.put(
    '/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateLeavePolicySchema,
    }),
    leavePolicyController.update
)

export default router
