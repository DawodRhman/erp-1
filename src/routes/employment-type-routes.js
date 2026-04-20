import { Router } from 'express';
import { verifyToken } from '../middleware/auth-middleware.js';
import {
    createEmploymentType,
    getEmploymentTypes,
    updateEmploymentType,
} from '../controllers/employment-type-controller.js';

const router = Router();

router.post('/employment-types', verifyToken, createEmploymentType);
router.get('/employment-types', verifyToken, getEmploymentTypes);
router.get('/employment-types/:id', verifyToken, getEmploymentTypes);
router.put('/employment-types/:id', verifyToken, updateEmploymentType);

export default router;
