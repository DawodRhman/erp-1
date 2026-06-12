import { Router } from 'express';
import { z } from 'zod';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission, requirePermission } from '../../middleware/require-permission.js';
import { validateParams } from '../../middleware/validate.js';
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from './announcements.controller.js';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(verifyToken);

router.get('/', requirePermission('announcements:read'), getAnnouncements);
router.post('/', requireAnyPermission('announcements:write', 'announcements:department_write'), createAnnouncement);
router.patch('/:id', requireAnyPermission('announcements:write', 'announcements:department_write'), validateParams(uuidParamSchema), updateAnnouncement);

export default router;
