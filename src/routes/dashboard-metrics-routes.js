import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import dashboardMetricsController from '../controllers/dashboard-metrics-controller.js'
import { dashboardMetricsQuerySchema } from '../schemas/dashboard-metrics.schema.js'

const router = Router()

router.get(
    '/metrics',
    verifyToken,
    requirePermission('config:read'),
    validate({ query: dashboardMetricsQuerySchema }),
    dashboardMetricsController.getMetrics
)

export default router
