import { Router } from 'express';
import designationController from '../controllers/designation-controller.js';
import { verifyToken } from '../middleware/auth-middleware.js';

const router = Router();

router.get('/', verifyToken, designationController.getAll);
router.get('/department/:departmentId', verifyToken, designationController.getByDepartment);
router.get('/:id', verifyToken, designationController.getById);
router.post('/', verifyToken, designationController.create);
router.put('/:id', verifyToken, designationController.update);

export default router;
