// Leave request controller - manages leave applications and approvals
import leaveRequestService from '../services/leave-request-service.js'

// Get all leave requests - filtered by role (HR sees all, employee sees own)
export const getLeaveRequests = async (req, res, next) => {
    try {
        let { status, employee, department } = req.query

        // Employee role - force employee filter to self
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            employee = req.user.employee_id
            department = null // Employee can't filter by department
        }

        const data = await leaveRequestService.getAll({
            status: status || null,
            employee_id: employee || null,
            department_id: department || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

// Create new leave request - employees can only create for themselves
export const createLeaveRequest = async (req, res, next) => {
    try {
        // Employee role - force employee_id to self
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            req.body.employee_id = req.user.employee_id
        }

        const request = await leaveRequestService.create(req.body)
        return res.status(201).json(request)
    } catch (err) {
        return next(err)
    }
}

// Approve leave request - HR/Admin only (requires leave:approve permission)
export const approveLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.approve({
            id: req.params.id,
            reviewed_by: req.user.user_id,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

// Reject leave request - HR/Admin only (requires leave:approve permission)
export const rejectLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.reject({
            id: req.params.id,
            reviewed_by: req.user.user_id,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

// Early return - employee returns before leave end date (adjusts balance)
export const earlyReturnLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.earlyReturn({
            id: req.params.id,
            end_by_force: req.body.end_by_force,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

// Get leave balances - filtered by role (HR sees all, employee sees own)
export const getLeaveBalances = async (req, res, next) => {
    try {
        let { department, location, shift } = req.query

        // Employee role - force filter to self
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            department = null
            location = null
            shift = null
            // Service should filter by current user's employee_id
            req.query.employee = req.user.employee_id
        }

        const data = await leaveRequestService.getBalances({
            department_id: department || null,
            work_location_id: location || null,
            shift_id: shift || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

// Get leave calendar - shows approved leaves by month/year
export const getLeaveCalendar = async (req, res, next) => {
    try {
        let { department, month, year } = req.query

        // Employee role - can only see calendar (no department filter)
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            department = null // Employee can't filter by department
        }

        const data = await leaveRequestService.getCalendar({
            department_id: department || null,
            month: month || null,
            year: year || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}
