import { Router } from 'express';
import { verifyToken } from '../middleware/auth-middleware.js';
import {
    createJobInfo,
    getJobInfo,
    updateJobInfo,
} from '../controllers/job-info-controller.js';

const router = Router();

router.post('/job-info', verifyToken, createJobInfo);
router.get('/job-info', verifyToken, getJobInfo);
router.get('/job-info/:id', verifyToken, getJobInfo);
router.put('/job-info/:id', verifyToken, updateJobInfo);

export default router;
