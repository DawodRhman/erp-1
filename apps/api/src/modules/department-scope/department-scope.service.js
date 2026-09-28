import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function getRoleName(roleId, db = pool) {
  const result = await db.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );
  return result.rows[0]?.role_name || null;
}

export async function resolveDepartmentScope(
  { roleId, userId, employeeId },
  { db = pool } = {}
) {
  const roleName = await getRoleName(roleId, db);
  if (roleName !== 'department_head') {
    return null;
  }

  const assignment = await db.query(
    `
      SELECT department_id, work_location_id, 'assignment'::text AS source
      FROM public.department_head_assignments
      WHERE user_id = $1
        AND is_active = true
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY effective_from DESC, created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  let row = assignment.rows[0];
  if (!row && employeeId) {
    const job = await db.query(
      `
        SELECT department_id, work_location_id
        FROM public.job_info
        WHERE employee_id = $1
        LIMIT 1
      `,
      [employeeId]
    );
    if (job.rows[0]?.department_id) {
      row = { ...job.rows[0], source: 'job_info' };
    }
  }

  if (!row?.department_id) {
    throw new AppError(
      403,
      'DEPARTMENT_SCOPE_MISSING',
      'Department Head access is not configured.'
    );
  }

  return {
    role_name: roleName,
    department_id: row.department_id,
    work_location_id: row.work_location_id || null,
    source: row.source,
  };
}

export async function assertEmployeeInScope(employeeId, scope, { db = pool } = {}) {
  if (!scope) return;

  const result = await db.query(
    `
      SELECT department_id, work_location_id
      FROM public.job_info
      WHERE employee_id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  const employee = result.rows[0];
  const matchesDepartment = employee?.department_id === scope.department_id;
  const matchesLocation =
    !scope.work_location_id || employee?.work_location_id === scope.work_location_id;

  if (!matchesDepartment || !matchesLocation) {
    throw new AppError(
      403,
      'OUTSIDE_DEPARTMENT_SCOPE',
      'Employee is outside your assigned department scope.'
    );
  }
}

