import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createWorkModeSchema, updateWorkModeSchema } from '../schemas/work-mode.schema.js'
import { createWorkMode, getWorkModes, updateWorkMode } from '../controllers/work-mode-controller.js'

const router = Router()

router.get('/work-modes', verifyToken, getWorkModes)
router.get('/work-modes/:id', verifyToken, getWorkModes)
router.post('/work-modes', verifyToken, requirePermission('config:manage'), validate(createWorkModeSchema), createWorkMode)
router.put('/work-modes/:id', verifyToken, requirePermission('config:manage'), validate(updateWorkModeSchema), updateWorkMode)

export default router
