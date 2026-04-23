import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department.schema.js'
import { createDepartment, getDepartments, updateDepartment } from '../controllers/department-controller.js'

const router = Router()

router.get('/departments', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getDepartments)
router.get('/departments/:id', verifyToken, requireAnyPermission(['config:read', 'config:manage']), getDepartments)
router.post('/departments', verifyToken, requirePermission('config:manage'), validate(createDepartmentSchema), createDepartment)
router.put('/departments/:id', verifyToken, requirePermission('config:manage'), validate(updateDepartmentSchema), updateDepartment)

export default router
