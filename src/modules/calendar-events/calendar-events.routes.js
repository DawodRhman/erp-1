import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
} from './calendar-events.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', getCalendarEvents);
router.post('/', requirePermission('calendar:write'), createCalendarEvent);
router.patch('/:id', requirePermission('calendar:write'), updateCalendarEvent);

export default router;
