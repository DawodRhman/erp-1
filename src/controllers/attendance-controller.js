// Attendance controller - manages daily attendance tracking and reports
import attendanceService from '../services/attendance-service.js'

// Get daily attendance sheet - filtered by role (HR sees all, employee sees own)
export const getDailySheet = async (req, res, next) => {
    try {
        let { date, department, location, shift, employee } = req.query

        if (!date) {
            return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD).' })
        }

        // Employee role - force employee filter to self
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            employee = req.user.employee_id
            department = null
            location = null
            shift = null
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

// Batch save attendance - HR marks multiple employees at once
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

// Get monthly attendance report - statistics per employee
export const getMonthlyReport = async (req, res, next) => {
    try {
        let { month, year, department } = req.query

        if (!month || !year) {
            return res.status(400).json({ error: 'month and year query params are required.' })
        }

        // Employee role - force department to null (will filter by employee_id in service if needed)
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            department = null
            // Add employee filter
            req.query.employee = req.user.employee_id
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
