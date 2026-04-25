import calendarEventService from '../services/calendar-event-service.js'

const calendarEventController = {
    getAll: async (req, res, next) => {
        try {
            const query = req.validated?.query ?? req.query
            const events = await calendarEventService.readByRange(query)
            return res.status(200).json(events)
        } catch (err) {
            return next(err)
        }
    },

    create: async (req, res, next) => {
        try {
            const event = await calendarEventService.create({
                ...req.body,
                created_by: req.user.user_id,
                updated_by: req.user.user_id,
            })
            return res.status(201).json(event)
        } catch (err) {
            return next(err)
        }
    },

    update: async (req, res, next) => {
        try {
            const event = await calendarEventService.update({
                id: req.params.id,
                ...req.body,
                updated_by: req.user.user_id,
            })

            if (!event) {
                return res.status(404).json({ error: 'Calendar event not found' })
            }

            return res.status(200).json(event)
        } catch (err) {
            return next(err)
        }
    },
}

export default calendarEventController
