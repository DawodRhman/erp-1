import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createJobInfoSchema, updateJobInfoSchema } from '../schemas/job-info.schema.js'
import {
    createJobInfo,
    getJobInfo,
    updateJobInfo,
} from '../controllers/job-info-controller.js'

const router = Router()

router.post('/job-info', verifyToken, requirePermission('employees:write'), validate(createJobInfoSchema), createJobInfo)
router.get('/job-info', verifyToken, requirePermission('employees:read'), getJobInfo)
router.get('/job-info/:id', verifyToken, requirePermission('employees:read'), getJobInfo)
router.put('/job-info/:id', verifyToken, requirePermission('employees:write'), validate(updateJobInfoSchema), updateJobInfo)

export default router
