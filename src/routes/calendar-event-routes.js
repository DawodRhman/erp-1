import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import calendarEventController from '../controllers/calendar-event-controller.js'
import {
    calendarEventParamsSchema,
    calendarEventQuerySchema,
    createCalendarEventSchema,
    updateCalendarEventSchema,
} from '../schemas/calendar-event.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('calendar:read'), validate({ query: calendarEventQuerySchema }), calendarEventController.getAll)
router.post('/', verifyToken, requirePermission('calendar:write'), validate(createCalendarEventSchema), calendarEventController.create)
router.put(
    '/:id',
    verifyToken,
    requirePermission('calendar:write'),
    validate({
        params: calendarEventParamsSchema,
        body: updateCalendarEventSchema,
    }),
    calendarEventController.update
)

export default router
