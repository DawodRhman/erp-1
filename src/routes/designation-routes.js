import { Router } from 'express'
import designationController from '../controllers/designation-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDesignationSchema, updateDesignationSchema } from '../schemas/designation.schema.js'

const router = Router()

router.get('/', verifyToken, designationController.getAll)
router.get('/department/:departmentId', verifyToken, designationController.getByDepartment)
router.get('/:id', verifyToken, designationController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), validate(createDesignationSchema), designationController.create)
router.put('/:id', verifyToken, requirePermission('config:manage'), validate(updateDesignationSchema), designationController.update)

export default router
