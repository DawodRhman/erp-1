import attendanceModel from '../models/attendance-model.js'

const attendanceService = {
    getDailySheet: (filters) => attendanceModel.getDailySheet(filters),

    batchSave: ({ date, rows, marked_by }) =>
        attendanceModel.batchSave({ date, rows, marked_by }),

    getMonthlyReport: (filters) => attendanceModel.getMonthlyReport(filters),

    acknowledge: async ({ attendanceId }) => {
        const row = await attendanceModel.findById(attendanceId)
        if (!row) return null
        if (row.ack === true) return row
        return attendanceModel.acknowledge(attendanceId)
    },
}

export default attendanceService
