import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createExtraEmployeeInfoSchema, updateExtraEmployeeInfoSchema } from '../schemas/extra-employee-info.schema.js'
import {
    createEmployee,
    getEmployees,
    updateEmployee,
} from '../controllers/extra-employee-info-controller.js'

const router = Router()

router.post('/extra-employees', verifyToken, requirePermission('employees:write'), validate(createExtraEmployeeInfoSchema), createEmployee)
router.get('/extra-employees', verifyToken, requirePermission('employees:read'), getEmployees)
router.put('/extra-employees', verifyToken, requirePermission('employees:write'), validate(updateExtraEmployeeInfoSchema), updateEmployee)

export default router
