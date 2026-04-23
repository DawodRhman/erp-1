import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department.schema.js'
import { createDepartment, getDepartments, updateDepartment } from '../controllers/department-controller.js'

const router = Router()

router.get('/departments', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getDepartments)
router.get(
    '/departments/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getDepartments
)
router.post('/departments', verifyToken, requirePermission('config:manage'), validate(createDepartmentSchema), createDepartment)
router.put(
    '/departments/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateDepartmentSchema,
    }),
    updateDepartment
)

export default router
