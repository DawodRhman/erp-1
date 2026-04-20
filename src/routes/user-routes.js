import { Router } from 'express'
import userController from '../controllers/user-controller.js'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'

const router = Router()

router.get('/', verifyToken, requirePermission('config:manage'), userController.getAll)
router.get('/:id', verifyToken, requirePermission('config:manage'), userController.getById)
router.post('/', verifyToken, requirePermission('config:manage'), userController.create)
router.patch('/:id', verifyToken, requirePermission('config:manage'), userController.updateStatus)

export default router
