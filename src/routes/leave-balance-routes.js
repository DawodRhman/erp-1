import { Router } from 'express';
import leaveBalanceController from '../controllers/leave-balance-controller.js';
import { verifyToken } from '../middleware/auth-middleware.js';

const router = Router();

router.get('/', verifyToken, leaveBalanceController.getAll);
router.get('/year/:year', verifyToken, leaveBalanceController.getByYear);
router.get('/employee/:employeeId', verifyToken, leaveBalanceController.getByEmployee);
router.get('/:id', verifyToken, leaveBalanceController.getById);
router.post('/', verifyToken, leaveBalanceController.create);
router.post('/employee/:employeeId/initialize', verifyToken, leaveBalanceController.initializeForEmployee);
router.put('/:id', verifyToken, leaveBalanceController.update);
router.patch('/:id/adjust', verifyToken, leaveBalanceController.adjustUsed);

export default router;
