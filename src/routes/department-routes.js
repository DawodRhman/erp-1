import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department.schema.js'
import { createDepartment, getDepartments, updateDepartment } from '../controllers/department-controller.js'

const router = Router()

router.get('/departments', verifyToken, getDepartments)
router.get('/departments/:id', verifyToken, getDepartments)
router.post('/departments', verifyToken, requirePermission('config:manage'), validate(createDepartmentSchema), createDepartment)
router.put('/departments/:id', verifyToken, requirePermission('config:manage'), validate(updateDepartmentSchema), updateDepartment)

export default router
