import pool from '../config/db.js'

const dashboardMetricsModel = {
    countEmployees: async () => {
        const result = await pool.query('SELECT COUNT(*)::int AS total FROM employee_info')
        return result.rows[0]?.total ?? 0
    },

    countJoinedInMonth: async ({ monthOffset }) => {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM job_info
             WHERE date_of_joining >= date_trunc('month', CURRENT_DATE + make_interval(months => $1::int))
               AND date_of_joining < date_trunc('month', CURRENT_DATE + make_interval(months => ($1::int + 1)))`,
            [monthOffset]
        )
        return result.rows[0]?.total ?? 0
    },

    countPresentToday: async () => {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM attendance
             WHERE date = CURRENT_DATE
               AND status IN ('present', 'late', 'half_day')`
        )
        return result.rows[0]?.total ?? 0
    },

    countOnLeaveToday: async () => {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM leave_requests
             WHERE status = 'approved'
               AND CURRENT_DATE BETWEEN start_date AND COALESCE(end_by_force, end_date)`
        )
        return result.rows[0]?.total ?? 0
    },

    countLeaveRequestsByStatus: async () => {
        const result = await pool.query(
            `SELECT status, COUNT(*)::int AS total
             FROM leave_requests
             GROUP BY status`
        )
        return Object.fromEntries(result.rows.map((row) => [row.status, row.total]))
    },

    readMonthlyAttendanceTrend: async ({ months }) => {
        const result = await pool.query(
            `WITH month_series AS (
                 SELECT generate_series(
                     date_trunc('month', CURRENT_DATE) - make_interval(months => ($1::int - 1)),
                     date_trunc('month', CURRENT_DATE),
                     interval '1 month'
                 )::date AS month_start
             )
             SELECT
                 to_char(ms.month_start, 'YYYY-MM') AS month,
                 COALESCE(COUNT(a.*) FILTER (WHERE a.status IN ('present', 'late', 'half_day')), 0)::int AS attendance_count
             FROM month_series ms
             LEFT JOIN attendance a
                 ON date_trunc('month', a.date) = ms.month_start
             GROUP BY ms.month_start
             ORDER BY ms.month_start ASC`,
            [months]
        )
        return result.rows
    },

    readMonthlyHeadcountTrend: async ({ months }) => {
        const result = await pool.query(
            `WITH month_series AS (
                 SELECT generate_series(
                     date_trunc('month', CURRENT_DATE) - make_interval(months => ($1::int - 1)),
                     date_trunc('month', CURRENT_DATE),
                     interval '1 month'
                 )::date AS month_start
             )
             SELECT
                 to_char(ms.month_start, 'YYYY-MM') AS month,
                 COUNT(ji.*)::int AS headcount
             FROM month_series ms
             LEFT JOIN job_info ji
                 ON ji.date_of_joining < (ms.month_start + interval '1 month')
                AND (ji.date_of_exit IS NULL OR ji.date_of_exit >= ms.month_start)
             GROUP BY ms.month_start
             ORDER BY ms.month_start ASC`,
            [months]
        )
        return result.rows
    },
}

export default dashboardMetricsModel
