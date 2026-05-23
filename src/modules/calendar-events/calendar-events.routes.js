import { Router } from 'express';
import { z } from 'zod';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validateParams, validateQuery } from '../../middleware/validate.js';
import { calendarEventQuerySchema } from '../../schemas/calendar-event.schema.js';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
} from './calendar-events.controller.js';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(verifyToken);

router.get('/', validateQuery(calendarEventQuerySchema), getCalendarEvents);
router.post('/', requirePermission('calendar:write'), createCalendarEvent);
router.patch('/:id', requirePermission('calendar:write'), validateParams(uuidParamSchema), updateCalendarEvent);

export default router;
