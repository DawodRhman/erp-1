import { Router } from 'express';
import { z } from 'zod';
import { verifyToken } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/require-permission.js';
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
router.post('/', requireAnyPermission('calendar:write', 'calendar:department_write'), createCalendarEvent);
router.patch('/:id', requireAnyPermission('calendar:write', 'calendar:department_write'), validateParams(uuidParamSchema), updateCalendarEvent);

export default router;
