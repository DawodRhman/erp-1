import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createJobInfoSchema, jobInfoQuerySchema, updateJobInfoSchema } from '../schemas/job-info.schema.js'
import {
    createJobInfo,
    getJobInfo,
    updateJobInfo,
} from '../controllers/job-info-controller.js'

const router = Router()

router.post('/job-info', verifyToken, requirePermission('employees:write'), validate(createJobInfoSchema), createJobInfo)
router.get(
    '/job-info',
    verifyToken,
    requirePermission('employees:read'),
    validate({ query: jobInfoQuerySchema }),
    getJobInfo
)
router.get(
    '/job-info/:id',
    verifyToken,
    requirePermission('employees:read'),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getJobInfo
)
router.put(
    '/job-info/:id',
    verifyToken,
    requirePermission('employees:write'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateJobInfoSchema,
    }),
    updateJobInfo
)

export default router
