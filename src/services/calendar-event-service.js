import calendarEventModel from '../models/calendar-event-model.js'

const calendarEventService = {
    readByRange: ({ from, to }) => calendarEventModel.readByRange({ from, to }),

    create: (data) => calendarEventModel.create(data),

    update: (data) => calendarEventModel.update(data),
}

export default calendarEventService
