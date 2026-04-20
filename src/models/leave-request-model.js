import pool from '../config/db.js'

const leaveRequestModel = {
    getAll: async ({ status, employee_id, department_id }) => {
        const conditions = ['1=1']
        const params = []
        let idx = 1

        if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status) }
        if (employee_id) { conditions.push(`lr.employee_id = $${idx++}`); params.push(employee_id) }
        if (department_id) { conditions.push(`ji.department_id = $${idx++}`); params.push(department_id) }

        const res = await pool.query(`
            SELECT
                lr.*,
                ei.name AS employee_name,
                lt.name AS leave_type_name,
                d.department_name,
                (lr.end_date - lr.start_date + 1) AS days
            FROM leave_requests lr
            JOIN employee_info ei ON ei.employee_id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            JOIN job_info ji ON ji.employee_id = lr.employee_id
            JOIN departments d ON d.id = ji.department_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY lr.created_at DESC
        `, params)

        return res.rows
    },

    create: async ({ employee_id, leave_type_id, start_date, end_date, reason }) => {
        const res = await pool.query(`
            INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [employee_id, leave_type_id, start_date, end_date, reason ?? null])
        return res.rows[0]
    },

    findById: async (id) => {
        const res = await pool.query(
            `SELECT * FROM leave_requests WHERE id = $1`,
            [id]
        )
        return res.rows[0]
    },

    checkOverlap: async ({ employee_id, start_date, end_date }) => {
        const res = await pool.query(`
            SELECT id FROM leave_requests
            WHERE employee_id = $1
              AND status IN ('pending', 'approved')
              AND NOT (end_date < $2 OR start_date > $3)
        `, [employee_id, start_date, end_date])
        return res.rows.length > 0
    },

    approve: async ({ id, reviewed_by }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const lr = await client.query(
                `SELECT * FROM leave_requests WHERE id = $1 AND status = 'pending'`,
                [id]
            )
            if (!lr.rows[0]) {
                await client.query('ROLLBACK')
                return null
            }

            const request = lr.rows[0]
            const days = Math.round(
                (new Date(request.end_date) - new Date(request.start_date)) / 86400000
            ) + 1

            await client.query(`
                UPDATE leave_requests
                SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
                WHERE id = $1
            `, [id, reviewed_by])

            await client.query(`
                UPDATE leave_balances
                SET used = used + $3, balance = balance - $3, updated_at = NOW()
                WHERE employee_id = $1
                  AND leave_type_id = $2
                  AND year = EXTRACT(YEAR FROM $4::date)
            `, [request.employee_id, request.leave_type_id, days, request.start_date])

            await client.query('COMMIT')
            return { ...request, status: 'approved' }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    reject: async ({ id, reviewed_by }) => {
        const res = await pool.query(`
            UPDATE leave_requests
            SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [id, reviewed_by])
        return res.rows[0] ?? null
    },

    earlyReturn: async ({ id, end_by_force }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const lr = await client.query(
                `SELECT * FROM leave_requests WHERE id = $1 AND status = 'approved'`,
                [id]
            )
            if (!lr.rows[0]) {
                await client.query('ROLLBACK')
                return null
            }

            const request = lr.rows[0]
            const originalDays = Math.round(
                (new Date(request.end_date) - new Date(request.start_date)) / 86400000
            ) + 1
            const actualDays = Math.max(
                1,
                Math.round((new Date(end_by_force) - new Date(request.start_date)) / 86400000) + 1
            )
            const daysToRestore = originalDays - actualDays

            await client.query(`
                UPDATE leave_requests
                SET end_by_force = $2, updated_at = NOW()
                WHERE id = $1
            `, [id, end_by_force])

            if (daysToRestore > 0) {
                await client.query(`
                    UPDATE leave_balances
                    SET used = used - $3, balance = balance + $3, updated_at = NOW()
                    WHERE employee_id = $1
                      AND leave_type_id = $2
                      AND year = EXTRACT(YEAR FROM $4::date)
                `, [request.employee_id, request.leave_type_id, daysToRestore, request.start_date])
            }

            await client.query('COMMIT')
            return { ...request, end_by_force, days_restored: daysToRestore }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    getBalances: async ({ department_id, work_location_id, shift_id }) => {
        const conditions = ['1=1']
        const params = []
        let idx = 1

        if (department_id) { conditions.push(`ji.department_id = $${idx++}`); params.push(department_id) }
        if (work_location_id) { conditions.push(`ji.work_location_id = $${idx++}`); params.push(work_location_id) }
        if (shift_id) { conditions.push(`ji.shift_id = $${idx++}`); params.push(shift_id) }

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                json_agg(
                    json_build_object(
                        'leave_type', lt.name,
                        'balance', lb.balance,
                        'total', lb.balance + lb.used
                    ) ORDER BY lt.name
                ) AS balances
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN departments d ON d.id = ji.department_id
            JOIN leave_balances lb ON lb.employee_id = ei.employee_id
            JOIN leave_types lt ON lt.id = lb.leave_type_id
            WHERE ${conditions.join(' AND ')}
            GROUP BY ei.employee_id, ei.name, d.department_name
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    },

    getCalendar: async ({ department_id, month, year }) => {
        const conditions = [`lr.status = 'approved'`]
        const params = []
        let idx = 1

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }
        if (month) {
            conditions.push(`EXTRACT(MONTH FROM lr.start_date) = $${idx++}`)
            params.push(parseInt(month))
        }
        if (year) {
            conditions.push(`EXTRACT(YEAR FROM lr.start_date) = $${idx++}`)
            params.push(parseInt(year))
        }

        const res = await pool.query(`
            SELECT
                lr.id,
                lr.employee_id,
                ei.name AS employee_name,
                lt.name AS leave_type,
                lr.start_date,
                lr.end_date,
                lr.end_by_force
            FROM leave_requests lr
            JOIN employee_info ei ON ei.employee_id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            JOIN job_info ji ON ji.employee_id = lr.employee_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY lr.start_date ASC
        `, params)

        return res.rows
    }
}

export default leaveRequestModel
