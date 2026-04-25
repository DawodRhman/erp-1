import dashboardSupportService from '../services/dashboard-support-service.js'

const dashboardSupportController = {
    getPendingActions: async (req, res, next) => {
        try {
            const items = await dashboardSupportService.readPendingActions()
            return res.status(200).json(items)
        } catch (err) {
            return next(err)
        }
    },

    getUrgentAlerts: async (req, res, next) => {
        try {
            const query = req.validated?.query ?? req.query
            const items = await dashboardSupportService.readUrgentAlerts(query)
            return res.status(200).json(items)
        } catch (err) {
            return next(err)
        }
    },
}

export default dashboardSupportController
