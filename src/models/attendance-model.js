import pool from '../config/db.js'

const attendanceModel = {
    getDailySheet: async ({ date, department_id, work_location_id, shift_id, employee_id }) => {
        const conditions = []
        const params = [date]
        let idx = 2

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }
        if (work_location_id) {
            conditions.push(`ji.work_location_id = $${idx++}`)
            params.push(work_location_id)
        }
        if (shift_id) {
            conditions.push(`ji.shift_id = $${idx++}`)
            params.push(shift_id)
        }
        if (employee_id) {
            conditions.push(`ei.employee_id = $${idx++}`)
            params.push(employee_id)
        }

        const whereClause = conditions.length > 0
            ? 'AND ' + conditions.join(' AND ')
            : ''

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                des.title AS designation,
                s.id AS shift_id,
                s.name AS shift_name,
                s.start_time AS expected_in,
                s.end_time,
                s.late_after_minutes,
                a.id AS attendance_id,
                a.check_in,
                a.check_out,
                COALESCE(a.status, 'absent') AS status,
                a.notes,
                COALESCE(a.ack, false) AS ack,
                CASE
                    WHEN a.check_in IS NOT NULL AND a.check_in > s.start_time
                    THEN ROUND(EXTRACT(EPOCH FROM (a.check_in - s.start_time)) / 60)
                    ELSE NULL
                END AS late_by_minutes,
                lr.reason AS leave_reason,
                (lr.id IS NOT NULL) AS notes_readonly
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN shifts s ON ji.shift_id = s.id
            JOIN departments d ON ji.department_id = d.id
            JOIN designations des ON ji.designation_id = des.id
            LEFT JOIN attendance a ON (
                a.employee_id = ei.employee_id
                AND a.date = $1
            )
            LEFT JOIN leave_requests lr ON (
                lr.employee_id = ei.employee_id
                AND lr.status = 'approved'
                AND $1 BETWEEN lr.start_date AND COALESCE(lr.end_by_force, lr.end_date)
            )
            WHERE 1=1 ${whereClause}
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    },

    batchSave: async ({ date, rows, marked_by }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const results = []
            for (const row of rows) {
                const res = await client.query(`
                    INSERT INTO attendance
                        (employee_id, shift_id, date, check_in, check_out, status, notes, marked_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (employee_id, date)
                    DO UPDATE SET
                        shift_id   = EXCLUDED.shift_id,
                        check_in   = EXCLUDED.check_in,
                        check_out  = EXCLUDED.check_out,
                        status     = EXCLUDED.status,
                        notes      = EXCLUDED.notes,
                        marked_by  = EXCLUDED.marked_by,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [
                    row.employee_id,
                    row.shift_id,
                    date,
                    row.check_in ?? null,
                    row.check_out ?? null,
                    row.status,
                    row.notes ?? null,
                    marked_by
                ])
                results.push(res.rows[0])
            }

            await client.query('COMMIT')
            return results
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    getMonthlyReport: async ({ month, year, department_id }) => {
        // Optimization: Use date range instead of EXTRACT for SARGability.
        // This allows the database to use an index on the date column.
        const m = parseInt(month)
        const y = parseInt(year)
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`
        const nextMonth = m === 12 ? 1 : m + 1
        const nextYear = m === 12 ? y + 1 : y
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

        const conditions = []
        const params = [startDate, endDate]
        let idx = 3

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }

        const whereClause = conditions.length > 0
            ? 'AND ' + conditions.join(' AND ')
            : ''

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                COUNT(*) FILTER (WHERE a.status = 'present')  AS presents,
                COUNT(*) FILTER (WHERE a.status = 'absent')   AS absents,
                COUNT(*) FILTER (WHERE a.status = 'late')     AS lates,
                COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
                COUNT(*) FILTER (WHERE a.status = 'on_leave') AS on_leaves,
                COUNT(*) AS total_working_days,
                ROUND(
                    COUNT(*) FILTER (WHERE a.status IN ('present', 'late', 'half_day'))
                    * 100.0 / NULLIF(COUNT(*), 0), 2
                ) AS attendance_pct
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN departments d ON ji.department_id = d.id
            JOIN attendance a USING (employee_id)
            WHERE a.date >= $1 AND a.date < $2
              ${whereClause}
            GROUP BY ei.employee_id, ei.name, d.department_name
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    }
}

export default attendanceModel
