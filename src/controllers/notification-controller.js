import notificationService from '../services/notification-service.js'

const notificationController = {
    getScoped: async (req, res, next) => {
        try {
            const data = await notificationService.readForScope({
                user_id: req.user.user_id,
                role: req.user.role,
            })
            return res.status(200).json(data)
        } catch (err) {
            return next(err)
        }
    },

    create: async (req, res, next) => {
        try {
            const items = await notificationService.create({
                ...req.body,
                created_by: req.user.user_id,
            })
            return res.status(201).json({ items, count: items.length })
        } catch (err) {
            return next(err)
        }
    },

    markRead: async (req, res, next) => {
        try {
            const item = await notificationService.markRead({
                id: req.params.id,
                user_id: req.user.user_id,
                role: req.user.role,
            })

            if (!item) {
                return res.status(404).json({ error: 'Not found' })
            }

            return res.status(200).json(item)
        } catch (err) {
            return next(err)
        }
    },
}

export default notificationController
