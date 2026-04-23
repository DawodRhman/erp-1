import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createWorkLocationSchema, updateWorkLocationSchema } from '../schemas/work-location.schema.js'
import { createWorkLocation, getWorkLocations, updateWorkLocation } from '../controllers/work-location-controller.js'

const router = Router()

router.get('/work-locations', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getWorkLocations)
router.get(
    '/work-locations/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getWorkLocations
)
router.post('/work-locations', verifyToken, requirePermission('config:manage'), validate(createWorkLocationSchema), createWorkLocation)
router.put(
    '/work-locations/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateWorkLocationSchema,
    }),
    updateWorkLocation
)

export default router
