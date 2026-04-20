import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createWorkLocationSchema, updateWorkLocationSchema } from '../schemas/work-location.schema.js'
import { createWorkLocation, getWorkLocations, updateWorkLocation } from '../controllers/work-location-controller.js'

const router = Router()

router.get('/work-locations', verifyToken, getWorkLocations)
router.get('/work-locations/:id', verifyToken, getWorkLocations)
router.post('/work-locations', verifyToken, requirePermission('config:manage'), validate(createWorkLocationSchema), createWorkLocation)
router.put('/work-locations/:id', verifyToken, requirePermission('config:manage'), validate(updateWorkLocationSchema), updateWorkLocation)

export default router
