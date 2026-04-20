import attendanceModel from '../models/attendance-model.js'

const attendanceService = {
    getDailySheet: (filters) => attendanceModel.getDailySheet(filters),

    batchSave: ({ date, rows, marked_by }) =>
        attendanceModel.batchSave({ date, rows, marked_by }),

    getMonthlyReport: (filters) => attendanceModel.getMonthlyReport(filters),
}

export default attendanceService
