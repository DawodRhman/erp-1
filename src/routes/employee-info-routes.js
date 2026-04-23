import { Router } from 'express'
import { z } from 'zod'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employee.schema.js'
import {
    createEmployee,
    getEmployees,
    getEmployeeById,
    getEmployeesId,
    updateEmployee,
} from '../controllers/employee-info-controller.js'

const router = Router()

router.get('/employees', verifyToken, requirePermission('employees:read'), getEmployees)
router.get('/employees/ids', verifyToken, requirePermission('employees:read'), getEmployeesId)
router.get(
    '/employees/:id',
    verifyToken,
    requirePermission('employees:read'),
    validate({ params: z.object({ id: z.string().uuid() }) }),
    getEmployeeById
)
router.post('/employees', verifyToken, requirePermission('employees:write'), validate(createEmployeeSchema), createEmployee)
router.put(
    '/employees/:id',
    verifyToken,
    requirePermission('employees:write'),
    validate({
        params: z.object({ id: z.string().uuid() }),
        body: updateEmployeeSchema,
    }),
    updateEmployee
)

export default router
