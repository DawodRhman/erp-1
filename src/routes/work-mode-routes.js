import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createWorkModeSchema, updateWorkModeSchema } from '../schemas/work-mode.schema.js'
import { createWorkMode, getWorkModes, updateWorkMode } from '../controllers/work-mode-controller.js'

const router = Router()

router.get('/work-modes', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getWorkModes)
router.get(
    '/work-modes/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getWorkModes
)
router.post('/work-modes', verifyToken, requirePermission('config:manage'), validate(createWorkModeSchema), createWorkMode)
router.put(
    '/work-modes/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateWorkModeSchema,
    }),
    updateWorkMode
)

export default router
