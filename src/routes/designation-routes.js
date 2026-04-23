import { Router } from 'express'
import designationController from '../controllers/designation-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requireAnyPermission, requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDesignationSchema, updateDesignationSchema } from '../schemas/designation.schema.js'

const router = Router()

router.get('/', verifyToken, requireAnyPermission(['config:read', 'config:manage']), designationController.getAll)
router.get('/department/:departmentId', verifyToken, requireAnyPermission(['config:read', 'config:manage']), designationController.getByDepartment)
router.get('/:id', verifyToken, requireAnyPermission(['config:read', 'config:manage']), designationController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createDesignationSchema), designationController.create)
router.put('/:id', verifyToken, requirePermission('config:manage'), validate(updateDesignationSchema), designationController.update)

export default router
