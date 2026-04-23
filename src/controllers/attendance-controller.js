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

// Employee acknowledges an attendance record (digital signature)
export const acknowledgeAttendance = async (req, res, next) => {
    try {
        const { attendanceId } = req.params

        // Super admin can ack any record (admin override)
        if (!req.user.is_super_admin) {
            // HR roles cannot acknowledge (employee-only verification per SRS Track#60)
            if (req.user.role === 'hr_manager' || req.user.role === 'hr_executive') {
                return res.status(403).json({ error: 'Access denied. Employees only.' })
            }
        }

        // Load current record (also supports idempotency if already acked)
        const record = await attendanceService.acknowledge({ attendanceId })
        if (!record) {
            return res.status(404).json({ error: 'Attendance record not found.' })
        }

        // Self-service enforcement for employee role
        if (!req.user.is_super_admin) {
            if (record.employee_id !== req.user.employee_id) {
                return res.status(403).json({ error: 'Access denied. You can only acknowledge your own attendance.' })
            }
        }

        return res.status(200).json(record)
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
