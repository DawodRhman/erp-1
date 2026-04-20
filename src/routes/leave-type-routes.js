import { Router } from 'express';
import leaveTypeController from '../controllers/leave-type-controller.js';
import { verifyToken } from '../middleware/auth-middleware.js';

const router = Router();

router.get('/', verifyToken, leaveTypeController.getAll);
router.get('/:id', verifyToken, leaveTypeController.getById);
router.post('/', verifyToken, leaveTypeController.create);
router.put('/:id', verifyToken, leaveTypeController.update);

export default router;
