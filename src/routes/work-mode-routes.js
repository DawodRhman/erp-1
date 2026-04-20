import { Router } from 'express';
import { verifyToken } from '../middleware/auth-middleware.js';
import {
    createWorkMode,
    getWorkModes,
    updateWorkMode,
} from '../controllers/work-mode-controller.js';

const router = Router();

router.post('/work-modes', verifyToken, createWorkMode);
router.get('/work-modes', verifyToken, getWorkModes);
router.get('/work-modes/:id', verifyToken, getWorkModes);
router.put('/work-modes/:id', verifyToken, updateWorkMode);

export default router;
