import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import notificationController from '../controllers/notification-controller.js'
import {
    createNotificationSchema,
    notificationParamsSchema,
    notificationQuerySchema,
} from '../schemas/notification.schema.js'

const router = Router()

router.get('/', verifyToken, requirePermission('notifications:read'), validate({ query: notificationQuerySchema }), notificationController.getScoped)
router.post('/', verifyToken, requirePermission('notifications:write'), validate(createNotificationSchema), notificationController.create)
router.patch(
    '/:id/read',
    verifyToken,
    requirePermission('notifications:read'),
    validate({ params: notificationParamsSchema }),
    notificationController.markRead
)

export default router
