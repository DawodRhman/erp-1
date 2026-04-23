import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createJobStatusSchema, updateJobStatusSchema } from '../schemas/job-status.schema.js'
import { createJobStatus, getJobStatuses, updateJobStatus } from '../controllers/job-status-controller.js'

const router = Router()

router.get('/job-statuses', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getJobStatuses)
router.get(
    '/job-statuses/:id',
    verifyToken,
    requireAnyPermission(['config:read', 'config:manage']),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getJobStatuses
)
router.post('/job-statuses', verifyToken, requirePermission('config:manage'), validate(createJobStatusSchema), createJobStatus)
router.put(
    '/job-statuses/:id',
    verifyToken,
    requirePermission('config:manage'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateJobStatusSchema,
    }),
    updateJobStatus
)

export default router
