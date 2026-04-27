import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  getMyNotifications,
  markRead,
  createNotification,
} from './notifications.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', getMyNotifications);
router.patch('/:id/read', markRead);
router.post('/', requirePermission('notifications:write'), createNotification);

export default router;
