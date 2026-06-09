import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

function daysBetweenInclusive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end - start) / 86400000) + 1;
}

function toIsoDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function toUtcDate(date) {
  const value = typeof date === 'string' ? date.slice(0, 10) : toIsoDateString(date);
  return new Date(`${value}T00:00:00.000Z`);
}

export function calculateProratedBalance(daysAllowed, joiningDate, year) {
  const entitlement = Number(daysAllowed);
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const lastDay = new Date(Date.UTC(year, 11, 31));
  const joined = toUtcDate(joiningDate);

  if (joined > lastDay) return 0;
  if (joined <= firstDay) return entitlement;

  const daysInYear = Math.round((lastDay - firstDay) / 86400000) + 1;
  const remainingDays = Math.round((lastDay - joined) / 86400000) + 1;
  return Math.round((remainingDays / daysInYear) * entitlement);
}

async function getEmployeeContext(employeeId, db = pool) {
  const result = await db.query(
    `
      SELECT ei.employee_id, ei.name, ji.department_id, ji.work_location_id, ji.shift_id, ji.date_of_joining
      FROM public.employee_info ei
      JOIN public.job_info ji ON ji.employee_id = ei.employee_id
      WHERE ei.employee_id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found.');
  }

  return result.rows[0];
}

export async function getRoleName(roleId) {
  const result = await pool.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );

  return result.rows[0]?.role_name || null;
}

export async function getLeaveBalances(employeeId) {
  const year = new Date().getFullYear();

  const result = await pool.query(
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
      ORDER BY lt.name ASC
    `,
    [employeeId, year]
  );

  return result.rows;
}

export async function getLeaveRequests({ status, employee_id, department_id } = {}) {
  const params = [];
  const filters = [];

  if (status) {
    params.push(status);
    filters.push(`lr.status = $${params.length}`);
  }

  if (employee_id) {
    params.push(employee_id);
    filters.push(`lr.employee_id = $${params.length}`);
  }

  if (department_id) {
    params.push(department_id);
    filters.push(`ji.department_id = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        lr.*,
        ei.name AS employee_name,
        lt.name AS leave_type,
        lt.name AS leave_type_name,
        COALESCE(lr.end_by_force, lr.end_date) AS effective_end_date,
        GREATEST(1, (COALESCE(lr.end_by_force, lr.end_date)::date - lr.start_date::date + 1))::int AS total_days,
        lr.rejection_reason AS review_note,
        COALESCE(reviewer_emp.name, reviewer_user.email) AS reviewed_by_name,
        d.department_name
      FROM public.leave_requests lr
      JOIN public.employee_info ei ON ei.employee_id = lr.employee_id
      JOIN public.job_info ji ON ji.employee_id = lr.employee_id
      LEFT JOIN public.departments d ON d.id = ji.department_id
      JOIN public.leave_types lt ON lt.id = lr.leave_type_id
      LEFT JOIN public.users reviewer_user ON reviewer_user.id = lr.reviewed_by
      LEFT JOIN public.employee_info reviewer_emp ON reviewer_emp.employee_id = reviewer_user.employee_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY lr.created_at DESC
    `,
    params
  );

  return result.rows;
}

export async function getMyLeaveRequests(employeeId) {
  return getLeaveRequests({ employee_id: employeeId });
}

export async function getLeaveBalancesAll({ department_id, location_id, shift_id, year }) {
  const selectedYear = year || new Date().getFullYear();
  const params = [selectedYear];
  const extraFilters = [];

  if (department_id) {
    params.push(department_id);
    extraFilters.push(`ji.department_id = $${params.length}`);
  }

  if (location_id) {
    params.push(location_id);
    extraFilters.push(`ji.work_location_id = $${params.length}`);
  }

  if (shift_id) {
    params.push(shift_id);
    extraFilters.push(`ji.shift_id = $${params.length}`);
  }

  const rows = await pool.query(
    `
      SELECT
        ei.employee_id,
        ei.name,
        (
          SELECT ea.file_path
          FROM public.employee_attachments ea
          WHERE ea.employee_id = ei.employee_id
            AND ea.kind = 'profile_photo'
          ORDER BY ea.created_at DESC
          LIMIT 1
        ) AS profile_photo_url,
        d.department_name,
        ji.work_location_id,
        ji.shift_id,
        lb.leave_type_id,
        lt.name AS leave_type_name,
        lb.balance,
        lb.used,
        (lb.balance - lb.used) AS remaining,
        lb.year
      FROM public.leave_balances lb
      JOIN public.employee_info ei ON ei.employee_id = lb.employee_id
      JOIN public.job_info ji ON ji.employee_id = lb.employee_id
      LEFT JOIN public.departments d ON d.id = ji.department_id
      JOIN public.leave_types lt ON lt.id = lb.leave_type_id
      WHERE lb.year = $1
      ${extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : ''}
      ORDER BY ei.employee_id, lt.name
    `,
    params
  );

  return rows.rows;
}

export async function getLeaveBalanceSummary(filters = {}) {
  const rows = await getLeaveBalancesAll(filters);
  const employees = new Map();

  for (const row of rows) {
    const allocated = Number(row.balance ?? 0);
    const used = Number(row.used ?? 0);
    const remaining = Number(row.remaining ?? allocated - used);
    const current = employees.get(row.employee_id) || {
      employee_id: row.employee_id,
      employee_name: row.name || row.employee_id,
      department_name: row.department_name || null,
      profile_photo_url: row.profile_photo_url || null,
      year: row.year,
      total_allocated: 0,
      total_used: 0,
      total_remaining: 0,
      leave_types: [],
    };

    current.total_allocated += allocated;
    current.total_used += used;
    current.total_remaining += remaining;
    current.leave_types.push({
      leave_type_id: row.leave_type_id,
      leave_type_name: row.leave_type_name,
      allocated,
      used,
      remaining,
    });
    employees.set(row.employee_id, current);
  }

  return Array.from(employees.values());
}

export async function initializeBalances(employeeId, year, { db = pool } = {}) {
  const employee = await getEmployeeContext(employeeId, db);

  const policies = await db.query(
    `
      SELECT DISTINCT ON (leave_type_id)
        leave_type_id,
        days_allowed,
        department_id
      FROM public.leave_policies
      WHERE (department_id = $1 OR department_id IS NULL)
        AND year = $2
        AND is_active = true
      ORDER BY leave_type_id, (department_id IS NOT NULL) DESC
    `,
    [employee.department_id, year]
  );

  const created = [];
  for (const policy of policies.rows) {
    const balance = calculateProratedBalance(policy.days_allowed, employee.date_of_joining, year);
    const insert = await db.query(
      `
        INSERT INTO public.leave_balances (
          employee_id,
          leave_type_id,
          year,
          balance,
          used
        )
        VALUES ($1, $2, $3, $4, 0)
        ON CONFLICT (employee_id, leave_type_id, year)
        DO NOTHING
        RETURNING *
      `,
      [employeeId, policy.leave_type_id, year, balance]
    );

    if (insert.rowCount > 0) {
      created.push(insert.rows[0]);
    }
  }

  return created;
}

export async function initializeYearlyBalances(year, { db = pool } = {}) {
  const employees = await db.query(
    `
      SELECT employee_id
      FROM public.job_info
      WHERE date_of_joining <= make_date($1, 12, 31)
        AND (date_of_exit IS NULL OR date_of_exit >= make_date($1, 1, 1))
      ORDER BY employee_id ASC
    `,
    [year]
  );

  let balancesCreated = 0;
  for (const employee of employees.rows) {
    const created = await initializeBalances(employee.employee_id, year, { db });
    balancesCreated += created.length;
  }

  return {
    year,
    employees_processed: employees.rows.length,
    balances_created: balancesCreated,
  };
}

export async function checkCapacity(employeeId, startDate, endDate) {
  const employee = await getEmployeeContext(employeeId);

  const capacityConfig = await pool.query(
    `
      SELECT max_percent
      FROM public.leave_capacity_config
      WHERE department_id = $1
        AND is_active = true
      LIMIT 1
    `,
    [employee.department_id]
  );

  const maxPercent = capacityConfig.rows[0]?.max_percent || 50;

  const headcountResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.job_info
      WHERE department_id = $1
    `,
    [employee.department_id]
  );

  const headcount = headcountResult.rows[0]?.total || 0;
  const exceededDates = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = toIsoDateString(d);

    const onLeave = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.leave_requests lr
        JOIN public.job_info ji ON ji.employee_id = lr.employee_id
        WHERE ji.department_id = $1
          AND lr.status = 'approved'
          AND $2::date BETWEEN lr.start_date AND COALESCE(lr.end_by_force, lr.end_date)
      `,
      [employee.department_id, day]
    );

    const onLeaveCount = onLeave.rows[0]?.total || 0;
    const percent = headcount > 0 ? (onLeaveCount / headcount) * 100 : 0;

    if (percent >= maxPercent) {
      exceededDates.push({
        date: day,
        on_leave_count: onLeaveCount,
        capacity_limit: maxPercent,
      });
    }
  }

  const suggestedDates = [];
  const requestLength = daysBetweenInclusive(startDate, endDate);

  for (let i = 1; i <= 30 && suggestedDates.length < 3; i += 1) {
    const candidateStart = new Date(start);
    candidateStart.setDate(candidateStart.getDate() + i);

    const candidateEnd = new Date(candidateStart);
    candidateEnd.setDate(candidateEnd.getDate() + requestLength - 1);

    let allowedWindow = true;

    for (let d = new Date(candidateStart); d <= candidateEnd; d.setDate(d.getDate() + 1)) {
      const day = toIsoDateString(d);
      const onLeave = await pool.query(
        `
          SELECT COUNT(*)::int AS total
          FROM public.leave_requests lr
          JOIN public.job_info ji ON ji.employee_id = lr.employee_id
          WHERE ji.department_id = $1
            AND lr.status = 'approved'
            AND $2::date BETWEEN lr.start_date AND COALESCE(lr.end_by_force, lr.end_date)
        `,
        [employee.department_id, day]
      );

      const onLeaveCount = onLeave.rows[0]?.total || 0;
      const percent = headcount > 0 ? (onLeaveCount / headcount) * 100 : 0;

      if (percent >= maxPercent) {
        allowedWindow = false;
        break;
      }
    }

    if (allowedWindow) {
      suggestedDates.push({
        start_date: toIsoDateString(candidateStart),
        end_date: toIsoDateString(candidateEnd),
      });
    }
  }

  return {
    allowed: exceededDates.length === 0,
    exceeded_dates: exceededDates,
    suggested_dates: suggestedDates,
  };
}

export async function submitLeaveRequest(employeeId, data) {
  const employee = await getEmployeeContext(employeeId);

  if (new Date(data.end_date) < new Date(data.start_date)) {
    throw new AppError(409, 'INVALID_DATE_RANGE', 'End date must be after start date.');
  }

  const requestedDays = daysBetweenInclusive(data.start_date, data.end_date);
  const year = new Date(data.start_date).getFullYear();

  if (year < new Date().getFullYear()) {
    throw new AppError(409, 'EXPIRED_LEAVE_YEAR', 'Leave balance from a previous year cannot be used for a new request.');
  }

  const balanceResult = await pool.query(
    `
      SELECT *
      FROM public.leave_balances
      WHERE employee_id = $1
        AND leave_type_id = $2
        AND year = $3
      LIMIT 1
    `,
    [employeeId, data.leave_type_id, year]
  );

  if (balanceResult.rowCount === 0) {
    throw new AppError(409, 'INSUFFICIENT_BALANCE', 'No leave balance configured.');
  }

  const balance = balanceResult.rows[0];
  const remaining = Number(balance.balance) - Number(balance.used);
  if (remaining < requestedDays) {
    throw new AppError(409, 'INSUFFICIENT_BALANCE', 'Insufficient leave balance.');
  }

  const capacity = await checkCapacity(employeeId, data.start_date, data.end_date);
  if (!capacity.allowed) {
    const firstExceeded = capacity.exceeded_dates[0] || {};
    const error = new AppError(409, 'CAPACITY_EXCEEDED', 'Department leave capacity exceeded.');
    error.details = {
      error: 'capacity_exceeded',
      department: employee.department_id,
      current_on_leave: firstExceeded.on_leave_count || 0,
      capacity_limit: firstExceeded.capacity_limit || 50,
      suggested_dates: capacity.suggested_dates,
    };
    throw error;
  }

  const created = await pool.query(
    `
      INSERT INTO public.leave_requests (
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        reason,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `,
    [employeeId, data.leave_type_id, data.start_date, data.end_date, data.reason || null]
  );

  await pool.query(
    `
      INSERT INTO public.notifications (user_id, role, type, message, created_by)
      VALUES (NULL, 'hr', 'leave_request', $1, $2)
    `,
    [
      `Leave request from ${employee.name} for ${data.start_date} to ${data.end_date}.`,
      data.created_by || null,
    ]
  );

  return created.rows[0];
}

export async function approveLeave(leaveId, reviewedByUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leaveResult = await client.query(
      `SELECT * FROM public.leave_requests WHERE id = $1 LIMIT 1`,
      [leaveId]
    );

    if (leaveResult.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
    }

    const leave = leaveResult.rows[0];
    const days = daysBetweenInclusive(leave.start_date, leave.end_date);
    const year = new Date(leave.start_date).getFullYear();

    const updatedLeave = await client.query(
      `
        UPDATE public.leave_requests
        SET status = 'approved',
            reviewed_by = $2,
            reviewed_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [leaveId, reviewedByUserId]
    );

    await client.query(
      `
        UPDATE public.leave_balances
        SET used = used + $4,
            updated_at = now()
        WHERE employee_id = $1
          AND leave_type_id = $2
          AND year = $3
      `,
      [leave.employee_id, leave.leave_type_id, year, days]
    );

    await client.query(
      `
        INSERT INTO public.notifications (user_id, role, type, message, created_by)
        SELECT u.id, NULL, 'leave_approved', $2, $3
        FROM public.users u
        WHERE u.employee_id = $1
      `,
      [
        leave.employee_id,
        `Your leave request (${leave.start_date} to ${leave.end_date}) has been approved.`,
        reviewedByUserId,
      ]
    );

    await client.query('COMMIT');
    return updatedLeave.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectLeave(leaveId, reviewedByUserId, reason) {
  const leaveResult = await pool.query(
    `SELECT * FROM public.leave_requests WHERE id = $1 LIMIT 1`,
    [leaveId]
  );

  if (leaveResult.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
  }

  let updated;
  try {
    updated = await pool.query(
      `
        UPDATE public.leave_requests
        SET status = 'rejected',
            reviewed_by = $2,
            reviewed_at = now(),
            rejection_reason = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [leaveId, reviewedByUserId, reason || null]
    );
  } catch {
    updated = await pool.query(
      `
        UPDATE public.leave_requests
        SET status = 'rejected',
            reviewed_by = $2,
            reviewed_at = now(),
            reason = COALESCE($3, reason),
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [leaveId, reviewedByUserId, reason || null]
    );
  }

  const leave = leaveResult.rows[0];

  await pool.query(
    `
      INSERT INTO public.notifications (user_id, role, type, message, created_by)
      SELECT u.id, NULL, 'leave_rejected', $2, $3
      FROM public.users u
      WHERE u.employee_id = $1
    `,
    [
      leave.employee_id,
      `Your leave request (${leave.start_date} to ${leave.end_date}) has been rejected.`,
      reviewedByUserId,
    ]
  );

  return updated.rows[0];
}

export async function earlyReturn(leaveId, hrUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leaveResult = await client.query(
      `SELECT * FROM public.leave_requests WHERE id = $1 LIMIT 1`,
      [leaveId]
    );

    if (leaveResult.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
    }

    const leave = leaveResult.rows[0];
    if (leave.status !== 'approved') {
      throw new AppError(409, 'INVALID_STATE', 'Only approved leave can be force-ended.');
    }

    const today = toIsoDateString(new Date());
    const originalDays = daysBetweenInclusive(leave.start_date, leave.end_date);
    const daysTaken = Math.max(daysBetweenInclusive(leave.start_date, today), 0);
    const daysRestored = Math.max(originalDays - daysTaken, 0);

    const updatedLeave = await client.query(
      `
        UPDATE public.leave_requests
        SET end_by_force = $2,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [leaveId, today]
    );

    const year = new Date(leave.start_date).getFullYear();

    await client.query(
      `
        UPDATE public.leave_balances
        SET used = GREATEST(used - $4, 0),
            updated_at = now()
        WHERE employee_id = $1
          AND leave_type_id = $2
          AND year = $3
      `,
      [leave.employee_id, leave.leave_type_id, year, daysRestored]
    );

    await client.query('COMMIT');

    return {
      ...updatedLeave.rows[0],
      days_taken: daysTaken,
      days_restored: daysRestored,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getLeaveCalendar({ month, year, department_id, branch_id, employee_id }) {
  const params = [year, month];
  const filters = [];

  if (department_id) {
    params.push(department_id);
    filters.push(`ji.department_id = $${params.length}`);
  }

  if (branch_id) {
    params.push(branch_id);
    filters.push(`ji.work_location_id = $${params.length}`);
  }

  if (employee_id) {
    params.push(employee_id);
    filters.push(`lr.employee_id = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        lr.employee_id,
        ei.name,
        d.department_name,
        lt.name AS leave_type,
        lr.start_date,
        COALESCE(lr.end_by_force, lr.end_date) AS end_date
      FROM public.leave_requests lr
      JOIN public.employee_info ei ON ei.employee_id = lr.employee_id
      JOIN public.job_info ji ON ji.employee_id = lr.employee_id
      LEFT JOIN public.departments d ON d.id = ji.department_id
      JOIN public.leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.status = 'approved'
        AND EXTRACT(YEAR FROM lr.start_date) = $1
        AND EXTRACT(MONTH FROM lr.start_date) = $2
        ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      ORDER BY lr.start_date ASC
    `,
    params
  );

  return result.rows;
}
