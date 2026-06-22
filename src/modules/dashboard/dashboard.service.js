import pool from '../../config/db.js';

function monthRange(range) {
  return range === '12m' ? 12 : 6;
}

function percent(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  return bottom > 0 ? Number(((top / bottom) * 100).toFixed(1)) : 0;
}

function addScopeCondition(params, scope, alias = 'ji') {
  if (!scope?.department_id) return '';
  params.push(scope.department_id);
  let condition = `${alias}.department_id = $${params.length}`;
  if (scope.work_location_id) {
    params.push(scope.work_location_id);
    condition += ` AND ${alias}.work_location_id = $${params.length}`;
  }
  return condition;
}

function scopedEmployeeExists(params, scope, employeeExpression) {
  const condition = addScopeCondition(params, scope, 'scope_ji');
  if (!condition) return '';
  return `EXISTS (
    SELECT 1
    FROM public.job_info scope_ji
    WHERE scope_ji.employee_id = ${employeeExpression}
      AND ${condition}
  )`;
}

export async function getHRMetrics(range = '6m', scope = null) {
  const months = monthRange(range);
  const totalEmployeesParams = [];
  const totalEmployeesScope = addScopeCondition(totalEmployeesParams, scope, 'ji');
  const newThisMonthParams = [];
  const newThisMonthScope = addScopeCondition(newThisMonthParams, scope, 'ji');
  const departmentCountParams = [];
  const departmentCountScope = scope?.department_id ? 'AND d.id = $1' : '';
  if (scope?.department_id) departmentCountParams.push(scope.department_id);
  const presentTodayParams = [];
  const presentTodayScope = scopedEmployeeExists(presentTodayParams, scope, 'a.employee_id');
  const onLeaveTodayParams = [];
  const onLeaveTodayScope = scopedEmployeeExists(onLeaveTodayParams, scope, 'lr.employee_id');

  const [
    totalEmployees,
    newThisMonth,
    departmentCount,
    presentToday,
    onLeaveToday,
    attendanceTrend,
    headcountTrend,
    upcomingBirthdays,
    pendingActions,
    urgentAlerts,
    attendanceKpis,
    leaveUtilization,
    recentActivity,
    departmentHeads,
  ] = await Promise.all([
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.employee_info ei
        ${totalEmployeesScope ? 'JOIN public.job_info ji ON ji.employee_id = ei.employee_id' : ''}
        ${totalEmployeesScope ? `WHERE ${totalEmployeesScope}` : ''}
      `,
      totalEmployeesParams
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.job_info ji
        WHERE date_trunc('month', ji.date_of_joining) = date_trunc('month', CURRENT_DATE)
          ${newThisMonthScope ? `AND ${newThisMonthScope}` : ''}
      `,
      newThisMonthParams
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.departments d
        WHERE d.is_active = true
          ${departmentCountScope}
      `,
      departmentCountParams
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.attendance a
        WHERE a.date = CURRENT_DATE
          AND a.status IN ('present', 'late', 'half_day')
          ${presentTodayScope ? `AND ${presentTodayScope}` : ''}
      `,
      presentTodayParams
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.leave_requests lr
        WHERE lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date AND COALESCE(lr.end_by_force, lr.end_date)
          ${onLeaveTodayScope ? `AND ${onLeaveTodayScope}` : ''}
      `,
      onLeaveTodayParams
    ),
    pool.query(
      `
        WITH months AS (
          SELECT to_char(date_trunc('month', CURRENT_DATE) - (interval '1 month' * gs), 'Mon') AS month_label,
                 date_trunc('month', CURRENT_DATE) - (interval '1 month' * gs) AS month_start
          FROM generate_series(0, $1 - 1) AS gs
        )
        SELECT
          m.month_label AS month,
          COUNT(a.*) FILTER (WHERE a.status = 'present')::int AS present,
          COUNT(a.*) FILTER (WHERE a.status = 'absent')::int AS absent,
          COUNT(a.*) FILTER (WHERE a.status = 'late')::int AS late
        FROM months m
        LEFT JOIN public.attendance a
          ON date_trunc('month', a.date) = m.month_start
        GROUP BY m.month_label, m.month_start
        ORDER BY m.month_start ASC
      `,
      [months]
    ),
    pool.query(
      `
        WITH months AS (
          SELECT date_trunc('month', CURRENT_DATE) - (interval '1 month' * gs) AS month_start
          FROM generate_series(0, $1 - 1) AS gs
        )
        SELECT
          to_char(m.month_start, 'Mon') AS month,
          COUNT(ji.*)::int AS count
        FROM months m
        LEFT JOIN public.job_info ji
          ON ji.date_of_joining <= (m.month_start + INTERVAL '1 month - 1 day')
        GROUP BY m.month_start
        ORDER BY m.month_start ASC
      `,
      [months]
    ),
    pool.query(
      `
        WITH employees AS (
          SELECT
            employee_id,
            name,
            d.department_name,
            CASE
              WHEN date_of_birth ~ '^\\d{4}-\\d{2}-\\d{2}$'
                THEN to_date(date_of_birth, 'YYYY-MM-DD')
              WHEN date_of_birth ~ '^\\d{2}-\\d{2}-\\d{4}$'
                THEN to_date(date_of_birth, 'DD-MM-YYYY')
              ELSE NULL
            END AS dob
          FROM public.employee_info
          LEFT JOIN public.job_info ji USING (employee_id)
          LEFT JOIN public.departments d ON d.id = ji.department_id
        ),
        birthdays AS (
          SELECT
            employee_id,
            name,
            department_name,
            dob,
            CASE
              WHEN make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM dob)::int,
                EXTRACT(DAY FROM dob)::int
              ) >= CURRENT_DATE
              THEN make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM dob)::int,
                EXTRACT(DAY FROM dob)::int
              )
              ELSE make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                EXTRACT(MONTH FROM dob)::int,
                EXTRACT(DAY FROM dob)::int
              )
            END AS next_birthday
          FROM employees
          WHERE dob IS NOT NULL
        )
        SELECT
          employee_id,
          name,
          department_name AS department,
          dob AS date_of_birth,
          next_birthday,
          (next_birthday - CURRENT_DATE)::int AS days_until
        FROM birthdays
        WHERE next_birthday <= CURRENT_DATE + 30
        ORDER BY days_until ASC
      `
    ),
    pool.query(
      `
        SELECT
          pa.employee_id,
          ei.name,
          pa.missing_fields
        FROM public.pending_actions pa
        JOIN public.employee_info ei ON ei.employee_id = pa.employee_id
        WHERE pa.status = 'open'
        ORDER BY pa.created_at DESC
      `
    ),

    pool.query(
      `
        SELECT
          ua.employee_id,
          ei.name,
          ua.type,
          ua.expiry_date,
          ua.expiry_date - CURRENT_DATE AS days_remaining
        FROM public.urgent_alerts ua
        JOIN public.employee_info ei ON ei.employee_id = ua.employee_id
        WHERE ua.status = 'open'
        ORDER BY ua.expiry_date ASC
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status IN ('present', 'late', 'half_day'))::int AS attended,
          COUNT(*) FILTER (WHERE status = 'present')::int AS on_time,
          COUNT(*) FILTER (WHERE status IN ('present', 'late', 'half_day', 'absent'))::int AS attendance_records
        FROM public.attendance
        WHERE date >= date_trunc('month', CURRENT_DATE)::date
          AND date <= CURRENT_DATE
      `
    ),
    pool.query(
      `
        SELECT
          COALESCE(SUM(used), 0)::numeric AS used,
          COALESCE(SUM(balance), 0)::numeric AS allocated
        FROM public.leave_balances
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      `
    ),
    pool.query(
      `
        SELECT
          al.id,
          al.action,
          al.entity_type AS type,
          al.entity_id,
          al.created_at,
          COALESCE(ei.name, u.email, al.meta ->> 'actor_email', 'System') AS actor_name
        FROM public.activity_logs al
        LEFT JOIN public.users u ON u.id = al.user_id
        LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
        WHERE al.created_at <= now()
        ORDER BY al.created_at DESC
        LIMIT 10
      `
    ),
    pool.query(
      `
        SELECT
          ei.employee_id,
          ei.name,
          u.email,
          d.department_name,
          wl.location_name AS work_location_name,
          dha.effective_from,
          dha.source
        FROM public.users u
        JOIN public.roles r ON r.id = u.role_id
        JOIN public.employee_info ei ON ei.employee_id = u.employee_id
        LEFT JOIN LATERAL (
          SELECT
            a.department_id,
            a.work_location_id,
            a.effective_from,
            'assignment'::text AS source
          FROM public.department_head_assignments a
          WHERE a.user_id = u.id
            AND a.is_active = true
            AND a.effective_from <= CURRENT_DATE
            AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
          ORDER BY a.effective_from DESC, a.created_at DESC
          LIMIT 1
        ) dha ON true
        LEFT JOIN public.job_info ji ON ji.employee_id = u.employee_id
        LEFT JOIN public.departments d ON d.id = COALESCE(dha.department_id, ji.department_id)
        LEFT JOIN public.work_locations wl ON wl.id = COALESCE(dha.work_location_id, ji.work_location_id)
        WHERE r.role_name = 'department_head'
        ORDER BY d.department_name ASC, ei.name ASC
      `
    ),
  ]);

  const totalEmployeesValue = totalEmployees.rows[0]?.total || 0;
  const presentTodayValue = presentToday.rows[0]?.total || 0;
  const attendanceKpiRow = attendanceKpis.rows[0] || {};
  const leaveUtilizationRow = leaveUtilization.rows[0] || {};

  return {
    total_employees: totalEmployeesValue,
    new_this_month: newThisMonth.rows[0]?.total || 0,
    department_count: departmentCount.rows[0]?.total || 0,
    present_today: presentTodayValue,
    present_today_percent:
      totalEmployeesValue > 0
        ? Number(((presentTodayValue / totalEmployeesValue) * 100).toFixed(1))
        : 0,
    attendance_rate_percent: percent(
      attendanceKpiRow.attended,
      attendanceKpiRow.attendance_records
    ),
    on_time_percent: percent(attendanceKpiRow.on_time, attendanceKpiRow.attended),
    leave_utilization_percent: percent(
      leaveUtilizationRow.used,
      leaveUtilizationRow.allocated
    ),
    kpi_periods: {
      attendance_rate: 'month_to_date',
      on_time_rate: 'month_to_date',
      leave_utilization: 'current_leave_year',
    },
    on_leave_today: onLeaveToday.rows[0]?.total || 0,
    penalties_this_month: { coming_soon: true, count: 0, amount_pkr: 0 },
    attendance_trend: attendanceTrend.rows,
    headcount_trend: headcountTrend.rows,
    upcoming_birthdays: upcomingBirthdays.rows,
    recent_activity: recentActivity.rows.map((row) => ({
      id: row.id,
      text: String(row.action || 'ACTIVITY').replaceAll('_', ' ').toLowerCase(),
      time: row.created_at,
      by: row.actor_name,
      type: row.type || 'system',
      entity_id: row.entity_id,
    })),
    department_heads: departmentHeads.rows,
    pending_actions: pendingActions.rows.map((row) => ({
      employee_id: row.employee_id,
      name: row.name,
      missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields : [],
    })),
    urgent_alerts: urgentAlerts.rows,
  };
}

export async function getEmployeeSelfMetrics(employeeId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    attendanceSummary,
    leaveBalances,
    activePenalties,
    upcomingBirthdays,
    recentAttendance,
    leaveRequests,
  ] = await Promise.all([
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'present')::int AS presents,
          COUNT(*) FILTER (WHERE status = 'absent')::int AS absents,
          COUNT(*) FILTER (WHERE status = 'late')::int AS lates,
          COUNT(*) FILTER (WHERE status = 'half_day')::int AS half_days
        FROM public.attendance
        WHERE employee_id = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
      `,
      [employeeId, year, month]
    ),
    pool.query(
      `
        SELECT
          lb.leave_type_id,
          lt.name,
          lb.balance,
          lb.used,
          (lb.balance - lb.used) AS remaining
        FROM public.leave_balances lb
        JOIN public.leave_types lt ON lt.id = lb.leave_type_id
        WHERE lb.employee_id = $1
          AND lb.year = $2
      `,
      [employeeId, year]
    ),
    pool.query(
      `
        SELECT
          ep.id,
          ep.employee_id,
          pr.name AS rule_name,
          COALESCE(ep.applied_amount_pkr, pr.amount_pkr) AS amount_pkr,
          ep.reason,
          ep.submitted_to_ho_at,
          ep.reviewed_at,
          proposer_emp.name AS proposed_by_name,
          reviewer_emp.name AS reviewed_by_name,
          ep.status,
          ep.employee_ack,
          ep.employee_acked_at
        FROM public.employee_penalties ep
        JOIN public.penalty_rules pr ON pr.id = ep.rule_id
        LEFT JOIN public.users proposer_user ON proposer_user.id = ep.proposed_by
        LEFT JOIN public.employee_info proposer_emp ON proposer_emp.employee_id = proposer_user.employee_id
        LEFT JOIN public.users reviewer_user ON reviewer_user.id = ep.reviewed_by
        LEFT JOIN public.employee_info reviewer_emp ON reviewer_emp.employee_id = reviewer_user.employee_id
        WHERE ep.employee_id = $1
          AND ep.status = 'approved'
          AND ep.employee_ack = false
        ORDER BY ep.created_at DESC
      `,
      [employeeId]
    ),
    pool.query(
      `
        WITH employees AS (
          SELECT
            employee_id,
            name,
            CASE
              WHEN date_of_birth ~ '^\\d{4}-\\d{2}-\\d{2}$'
                THEN to_date(date_of_birth, 'YYYY-MM-DD')
              WHEN date_of_birth ~ '^\\d{2}-\\d{2}-\\d{4}$'
                THEN to_date(date_of_birth, 'DD-MM-YYYY')
              ELSE NULL
            END AS dob
          FROM public.employee_info
        )
        SELECT
          employee_id,
          name,
          dob AS date_of_birth,
          GREATEST(
            0,
            (
              make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM dob)::int,
                EXTRACT(DAY FROM dob)::int
              ) - CURRENT_DATE
            )::int
          ) AS days_until
        FROM employees
        WHERE dob IS NOT NULL
          AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE)
        ORDER BY days_until ASC
      `
    ),
    pool.query(
      `
        SELECT
          date,
          status,
          check_in,
          check_out
        FROM public.attendance
        WHERE employee_id = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
        ORDER BY date DESC
        LIMIT 6
      `,
      [employeeId, year, month]
    ),
    pool.query(
      `
        SELECT
          lr.id,
          lt.name AS leave_type,
          lr.start_date,
          lr.end_date,
          lr.status
        FROM public.leave_requests lr
        JOIN public.leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = $1
        ORDER BY lr.created_at DESC
        LIMIT 20
      `,
      [employeeId]
    ),
  ]);

  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const upcomingBirthdayRows = upcomingBirthdays.rows;

  return {
    attendance_summary: {
      presents: attendanceSummary.rows[0]?.presents || 0,
      absents: attendanceSummary.rows[0]?.absents || 0,
      lates: attendanceSummary.rows[0]?.lates || 0,
      half_days: attendanceSummary.rows[0]?.half_days || 0,
      month: monthLabel,
    },
    leave_balances: leaveBalances.rows,
    leave_wallet: leaveBalances.rows,
    active_penalties: activePenalties.rows,
    recent_attendance: recentAttendance.rows,
    leave_requests: leaveRequests.rows,
    upcoming_birthdays: upcomingBirthdayRows,
  };
}

export async function getPendingActions() {
  const result = await pool.query(
    `
      SELECT
        pa.employee_id,
        ei.name,
        pa.missing_fields
      FROM public.pending_actions pa
      JOIN public.employee_info ei ON ei.employee_id = pa.employee_id
      WHERE pa.status = 'open'
      ORDER BY pa.created_at DESC
    `
  );

  return result.rows.map((row) => ({
    employee_id: row.employee_id,
    name: row.name,
    missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields : [],
  }));
}


export async function getUrgentAlerts(days = 30) {
  const result = await pool.query(
    `
      SELECT
        ua.employee_id,
        ei.name,
        ua.type,
        ua.expiry_date,
        ua.expiry_date - CURRENT_DATE AS days_remaining
      FROM public.urgent_alerts ua
      JOIN public.employee_info ei ON ei.employee_id = ua.employee_id
      WHERE ua.status = 'open'
      ORDER BY ua.expiry_date ASC
    `
  );
  return result.rows;
}
