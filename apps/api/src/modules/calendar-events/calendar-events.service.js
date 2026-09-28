import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

async function getRoleName(roleId) {
  const result = await pool.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );
  return result.rows[0]?.role_name || null;
}

function normalizeTargetIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))];
}

function applyDepartmentScope(departmentIds, scope) {
  if (!scope) return departmentIds;
  return [scope.department_id];
}

async function assertDesignationsInDepartments(designationIds, departmentIds) {
  if (!designationIds.length || !departmentIds.length) return;

  const result = await pool.query(
    `
      SELECT id
      FROM public.designations
      WHERE id = ANY($1::uuid[])
        AND department_id = ANY($2::uuid[])
    `,
    [designationIds, departmentIds]
  );

  if (result.rowCount !== designationIds.length) {
    throw new AppError(403, 'OUTSIDE_DEPARTMENT_SCOPE', 'One or more designations are outside your assigned department scope.');
  }
}

function resolveDateRange(payload) {
  const startDate = payload.start_date || payload.date;
  const endDate = payload.end_date || startDate;
  return { startDate, endDate };
}

export async function getCalendarEvents({ from, to, type, search, sort, order, roleId, employeeId }) {
  const roleName = await getRoleName(roleId);

  const filters = [];
  const params = [];
  let viewerJoin = '';

  if (from && to) {
    params.push(to);
    filters.push(`ce.start_date <= $${params.length}`);
    params.push(from);
    filters.push(`ce.end_date >= $${params.length}`);
  } else if (from) {
    params.push(from);
    filters.push(`ce.end_date >= $${params.length}`);
  } else if (to) {
    params.push(to);
    filters.push(`ce.start_date <= $${params.length}`);
  }

  if (type) {
    params.push(type);
    filters.push(`ce.type = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    filters.push(`ce.title ILIKE $${params.length}`);
  }

  if (roleName === 'employee') {
    if (employeeId) {
      params.push(employeeId);
      viewerJoin = `LEFT JOIN public.job_info viewer_job ON viewer_job.employee_id = $${params.length}`;
      filters.push(`(
        cardinality(ce.target_department_ids) = 0
        OR viewer_job.department_id = ANY(ce.target_department_ids)
      )`);
      filters.push(`(
        cardinality(ce.target_designation_ids) = 0
        OR viewer_job.designation_id = ANY(ce.target_designation_ids)
      )`);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  // Whitelist sort columns to prevent SQL injection
  const allowedSortColumns = { date: 'ce.start_date', title: 'ce.title', type: 'ce.type', created_at: 'ce.created_at' };
  const sortColumn = allowedSortColumns[sort] || 'ce.start_date';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  const result = await pool.query(
    `
      SELECT
        ce.*,
        target_departments.names AS target_department_names,
        target_designations.names AS target_designation_names
      FROM public.calendar_events ce
      ${viewerJoin}
      LEFT JOIN LATERAL (
        SELECT array_agg(d.department_name ORDER BY d.department_name) AS names
        FROM public.departments d
        WHERE d.id = ANY(ce.target_department_ids)
      ) target_departments ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(dsg.title ORDER BY dsg.title) AS names
        FROM public.designations dsg
        WHERE dsg.id = ANY(ce.target_designation_ids)
      ) target_designations ON true
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}, ce.created_at DESC
    `,
    params
  );

  return result.rows;
}

export async function createCalendarEvent(payload, userId, scope = null) {
  const departmentIds = applyDepartmentScope(normalizeTargetIds(payload.target_department_ids), scope);
  const designationIds = normalizeTargetIds(payload.target_designation_ids);
  if (scope) {
    await assertDesignationsInDepartments(designationIds, departmentIds);
  }
  const { startDate, endDate } = resolveDateRange(payload);
  const result = await pool.query(
    `
      INSERT INTO public.calendar_events (
        type,
        date,
        start_date,
        end_date,
        title,
        target_department_ids,
        target_designation_ids,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *
    `,
    [payload.type, startDate, endDate, payload.title, departmentIds, designationIds, userId]
  );

  return result.rows[0];
}

export async function updateCalendarEvent(id, payload, userId, scope = null) {
  const fields = [];
  const values = [];

  const normalizedPayload = { ...payload };
  if (Object.prototype.hasOwnProperty.call(payload, 'target_department_ids')) {
    normalizedPayload.target_department_ids = applyDepartmentScope(normalizeTargetIds(payload.target_department_ids), scope);
  }
  if (scope && !Object.prototype.hasOwnProperty.call(normalizedPayload, 'target_department_ids')) {
    normalizedPayload.target_department_ids = [scope.department_id];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'target_designation_ids')) {
    normalizedPayload.target_designation_ids = normalizeTargetIds(payload.target_designation_ids);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'start_date')) {
    normalizedPayload.date = payload.start_date;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'date') && !Object.prototype.hasOwnProperty.call(payload, 'start_date')) {
    normalizedPayload.start_date = payload.date;
  }
  if (
    (Object.prototype.hasOwnProperty.call(payload, 'start_date') || Object.prototype.hasOwnProperty.call(payload, 'date')) &&
    !Object.prototype.hasOwnProperty.call(payload, 'end_date')
  ) {
    normalizedPayload.end_date = payload.start_date || payload.date;
  }

  for (const key of ['type', 'date', 'start_date', 'end_date', 'title', 'target_department_ids', 'target_designation_ids']) {
    if (Object.prototype.hasOwnProperty.call(normalizedPayload, key)) {
      values.push(normalizedPayload[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) {
    const existing = await pool.query(`SELECT * FROM public.calendar_events WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Calendar event not found.');
    }
    return existing.rows[0];
  }

  if (scope) {
    await assertDesignationsInDepartments(
      normalizeTargetIds(normalizedPayload.target_designation_ids),
      normalizeTargetIds(normalizedPayload.target_department_ids)
    );
  }

  values.push(userId);
  values.push(id);

  const result = await pool.query(
    `
      UPDATE public.calendar_events
      SET ${fields.join(', ')}, updated_by = $${values.length - 1}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *
    `,
    values
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Calendar event not found.');
  }

  return result.rows[0];
}
