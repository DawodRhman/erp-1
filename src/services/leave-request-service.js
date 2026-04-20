import pool from '../config/db.js'
import leaveRequestModel from '../models/leave-request-model.js'

const leaveRequestService = {
    getAll: (filters) => leaveRequestModel.getAll(filters),

    create: async ({ employee_id, leave_type_id, start_date, end_date, reason }) => {
        const emp = await pool.query(
            'SELECT id FROM employee_info WHERE employee_id = $1',
            [employee_id]
        )
        if (!emp.rows[0]) {
            const err = new Error('Employee not found.')
            err.status = 404
            throw err
        }

        const lt = await pool.query(
            'SELECT id FROM leave_types WHERE id = $1',
            [leave_type_id]
        )
        if (!lt.rows[0]) {
            const err = new Error('Leave type not found.')
            err.status = 404
            throw err
        }

        const days = Math.round(
            (new Date(end_date) - new Date(start_date)) / 86400000
        ) + 1
        const year = new Date(start_date).getFullYear()

        const bal = await pool.query(
            `SELECT balance FROM leave_balances
             WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3`,
            [employee_id, leave_type_id, year]
        )
        if (!bal.rows[0] || bal.rows[0].balance < days) {
            const err = new Error('Insufficient leave balance.')
            err.status = 409
            throw err
        }

        const hasOverlap = await leaveRequestModel.checkOverlap({ employee_id, start_date, end_date })
        if (hasOverlap) {
            const err = new Error('Overlapping leave request already exists.')
            err.status = 409
            throw err
        }

        return leaveRequestModel.create({ employee_id, leave_type_id, start_date, end_date, reason })
    },

    approve: async ({ id, reviewed_by }) => {
        const result = await leaveRequestModel.approve({ id, reviewed_by })
        if (!result) {
            const err = new Error('Leave request not found or not in pending status.')
            err.status = 409
            throw err
        }
        return result
    },

    reject: async ({ id, reviewed_by }) => {
        const result = await leaveRequestModel.reject({ id, reviewed_by })
        if (!result) {
            const err = new Error('Leave request not found or not in pending status.')
            err.status = 409
            throw err
        }
        return result
    },

    earlyReturn: async ({ id, end_by_force }) => {
        const result = await leaveRequestModel.earlyReturn({ id, end_by_force })
        if (!result) {
            const err = new Error('Leave request not found or not in approved status.')
            err.status = 409
            throw err
        }
        return result
    },

    getBalances: (filters) => leaveRequestModel.getBalances(filters),

    getCalendar: (filters) => leaveRequestModel.getCalendar(filters),
}

export default leaveRequestService
