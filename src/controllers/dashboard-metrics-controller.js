import dashboardMetricsService from '../services/dashboard-metrics-service.js'

const dashboardMetricsController = {
    getMetrics: async (req, res, next) => {
        try {
            const query = req.validated?.query ?? req.query
            const data = await dashboardMetricsService.readMetrics(query)
            return res.status(200).json(data)
        } catch (err) {
            return next(err)
        }
    },
}

export default dashboardMetricsController
