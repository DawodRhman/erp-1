import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { getDirectory, createEntry, updateEntry } from './directory.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermission('directory:read'), getDirectory);
router.post('/', requirePermission('directory:write'), createEntry);
router.patch('/:id', requirePermission('directory:write'), updateEntry);

export default router;
