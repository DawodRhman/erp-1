import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { getActivityLogs } from './audit.controller.js';

const router = Router();

router.use(verifyToken);
router.get('/activity-logs', getActivityLogs);

export default router;
