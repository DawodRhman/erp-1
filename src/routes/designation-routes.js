import { Router } from 'express'
import { z } from 'zod'
import designationController from '../controllers/designation-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDesignationSchema, updateDesignationSchema } from '../schemas/designation.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), designationController.getAll)
router.get(
    '/department/:departmentId',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ departmentId: z.string().uuid() }) }),
    designationController.getByDepartment
)
router.get(
    '/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    designationController.getById
)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createDesignationSchema), designationController.create)
router.put(
    '/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateDesignationSchema,
    }),
    designationController.update
)

export default router
