import leaveRequestService from '../services/leave-request-service.js'

export const getLeaveRequests = async (req, res, next) => {
    try {
        const { status, employee, department } = req.query
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

export const createLeaveRequest = async (req, res, next) => {
    try {
        const request = await leaveRequestService.create(req.body)
        return res.status(201).json(request)
    } catch (err) {
        return next(err)
    }
}

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

export const getLeaveBalances = async (req, res, next) => {
    try {
        const { department, location, shift } = req.query
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

export const getLeaveCalendar = async (req, res, next) => {
    try {
        const { department, month, year } = req.query
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
