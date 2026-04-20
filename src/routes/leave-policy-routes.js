import { Router } from 'express';
import leavePolicyController from '../controllers/leave-policy-controller.js';
import { verifyToken } from '../middleware/auth-middleware.js';

const router = Router();

router.get('/', verifyToken, leavePolicyController.getAll);
router.get('/year/:year', verifyToken, leavePolicyController.getByYear);
router.get('/:id', verifyToken, leavePolicyController.getById);
router.post('/', verifyToken, leavePolicyController.create);
router.put('/:id', verifyToken, leavePolicyController.update);

export default router;
