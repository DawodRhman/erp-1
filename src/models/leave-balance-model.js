import pool from '../config/db.js'

const leaveBalanceTable = {
    create: async (data) => {
        const { employee_id, leave_type_id, year, balance = 0, used = 0 } = data
        const resp = await pool.query(
            `
            INSERT INTO leave_balances (employee_id, leave_type_id, year, balance, used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [employee_id, leave_type_id, year, balance, used]
        )
        return resp.rows[0] ?? null
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query(
                `
                SELECT
                    lb.*,
                    lt.name AS leave_type_name,
                    (lb.balance + lb.used) AS total
                FROM leave_balances lb
                JOIN leave_types lt ON lb.leave_type_id = lt.id
                WHERE lb.id = $1
                `,
                [id]
            )
            return res.rows[0] ?? null
        }

        const res = await pool.query(
            `
            SELECT
                lb.*,
                lt.name AS leave_type_name,
                (lb.balance + lb.used) AS total
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            ORDER BY lb.employee_id, lb.year DESC, lt.name
            `
        )
        return res.rows
    },

    readByEmployee: async (employeeId, year = null) => {
        const params = [employeeId]
        let idx = 2
        const conditions = ['lb.employee_id = $1']

        if (year !== null && year !== undefined && year !== '') {
            conditions.push(`lb.year = $${idx++}`)
            params.push(parseInt(year))
        }

        const res = await pool.query(
            `
            SELECT
                lb.*,
                lt.name AS leave_type_name,
                (lb.balance + lb.used) AS total
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY lb.year DESC, lt.name
            `,
            params
        )
        return res.rows
    },

    readByYear: async (year) => {
        const res = await pool.query(
            `
            SELECT
                lb.*,
                lt.name AS leave_type_name,
                (lb.balance + lb.used) AS total
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.year = $1
            ORDER BY lb.employee_id, lt.name
            `,
            [parseInt(year)]
        )
        return res.rows
    },

    update: async (data) => {
        const { id, balance, used } = data

        const fields = []
        const values = [id]
        let idx = 2

        if (balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(balance) }
        if (used !== undefined) { fields.push(`used = $${idx++}`); values.push(used) }

        if (fields.length === 0) {
            const err = new Error('No fields provided to update.')
            err.status = 400
            throw err
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`)

        const resp = await pool.query(
            `
            UPDATE leave_balances
            SET ${fields.join(', ')}
            WHERE id = $1
            RETURNING *
            `,
            values
        )
        return resp.rows[0] ?? null
    },

    // Used when leave is approved/cancelled to adjust counts.
    // Positive adjustment consumes leave: used += adj, balance -= adj.
    // Negative adjustment restores leave: used -= adj, balance += adj.
    adjustUsed: async (id, adjustment) => {
        const resp = await pool.query(
            `
            UPDATE leave_balances
            SET used = used + $2,
                balance = balance - $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [id, adjustment]
        )
        return resp.rows[0] ?? null
    },

    findByEmployeeTypeYear: async (employeeId, leaveTypeId, year) => {
        const res = await pool.query(
            `
            SELECT * FROM leave_balances
            WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
            `,
            [employeeId, leaveTypeId, year]
        )
        return res.rows[0] ?? null
    },
}

export default leaveBalanceTable

