import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createEmploymentTypeSchema, updateEmploymentTypeSchema } from '../schemas/employment-type.schema.js'
import { createEmploymentType, getEmploymentTypes, updateEmploymentType } from '../controllers/employment-type-controller.js'

const router = Router()

router.get('/employment-types', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getEmploymentTypes)
router.get(
    '/employment-types/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getEmploymentTypes
)
router.post('/employment-types', verifyToken, requirePermission('config:manage'), validate(createEmploymentTypeSchema), createEmploymentType)
router.put(
    '/employment-types/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateEmploymentTypeSchema,
    }),
    updateEmploymentType
)

export default router
