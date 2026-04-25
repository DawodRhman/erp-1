import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import dashboardSupportController from '../controllers/dashboard-support-controller.js'
import { urgentAlertsQuerySchema } from '../schemas/dashboard-support.schema.js'

const router = Router()

router.get('/pending-actions', verifyToken, requirePermission('pending_actions:read'), dashboardSupportController.getPendingActions)
router.get(
    '/urgent-alerts',
    verifyToken,
    requirePermission('alerts:read'),
    validate({ query: urgentAlertsQuerySchema }),
    dashboardSupportController.getUrgentAlerts
)

export default router
