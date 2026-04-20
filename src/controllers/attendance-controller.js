import attendanceService from '../services/attendance-service.js'

export const getDailySheet = async (req, res, next) => {
    try {
        const { date, department, location, shift, employee } = req.query

        if (!date) {
            return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD).' })
        }

        const data = await attendanceService.getDailySheet({
            date,
            department_id: department || null,
            work_location_id: location || null,
            shift_id: shift || null,
            employee_id: employee || null,
        })

        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const batchSaveAttendance = async (req, res, next) => {
    try {
        const { date, rows } = req.body
        const marked_by = req.user.user_id

        const results = await attendanceService.batchSave({ date, rows, marked_by })
        return res.status(200).json({ saved: results.length, records: results })
    } catch (err) {
        return next(err)
    }
}

export const getMonthlyReport = async (req, res, next) => {
    try {
        const { month, year, department } = req.query

        if (!month || !year) {
            return res.status(400).json({ error: 'month and year query params are required.' })
        }

        const data = await attendanceService.getMonthlyReport({
            month,
            year,
            department_id: department || null,
        })

        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}
