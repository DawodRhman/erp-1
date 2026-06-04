import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

function audienceFilterForRole(roleName) {
  if (roleName === 'employee') return `a.audience IN ('all', 'employee')`;
  return `a.audience IN ('all', 'hr', 'employee')`;
}

function normalizeTargetIds(value, fallback) {
  const source = Array.isArray(value) ? value : fallback ? [fallback] : [];
  return [...new Set(source.filter(Boolean))];
}

export async function listAnnouncements({ activeOnly = true, roleName = 'employee', all = false, employeeId } = {}) {
  const filters = [];
  const params = [];
  const shouldScopeToEmployeeTargets = !all && roleName === 'employee' && employeeId;

  if (activeOnly && !all) {
    filters.push('a.is_active = true');
  }

  if (!all) {
    filters.push(audienceFilterForRole(roleName));
  }

  if (shouldScopeToEmployeeTargets) {
    params.push(employeeId);
    filters.push(`(
      cardinality(a.target_department_ids) = 0
      OR viewer_job.department_id = ANY(a.target_department_ids)
    )`);
    filters.push(`(
      cardinality(a.target_designation_ids) = 0
      OR viewer_job.designation_id = ANY(a.target_designation_ids)
    )`);
  }

  const result = await pool.query(
    `
      SELECT
        a.*,
        creator_emp.name AS created_by_name,
        updater_emp.name AS updated_by_name,
        target_departments.names AS target_department_names,
        target_designations.names AS target_designation_names
      FROM public.announcements a
      LEFT JOIN public.users creator_user ON creator_user.id = a.created_by
      LEFT JOIN public.employee_info creator_emp ON creator_emp.employee_id = creator_user.employee_id
      LEFT JOIN public.users updater_user ON updater_user.id = a.updated_by
      LEFT JOIN public.employee_info updater_emp ON updater_emp.employee_id = updater_user.employee_id
      LEFT JOIN LATERAL (
        SELECT array_agg(d.department_name ORDER BY d.department_name) AS names
        FROM public.departments d
        WHERE d.id = ANY(a.target_department_ids)
      ) target_departments ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(dsg.title ORDER BY dsg.title) AS names
        FROM public.designations dsg
        WHERE dsg.id = ANY(a.target_designation_ids)
      ) target_designations ON true
      ${shouldScopeToEmployeeTargets ? `LEFT JOIN public.job_info viewer_job ON viewer_job.employee_id = $1` : ''}
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC
    `,
    params
  );

  return result.rows;
}

export async function createAnnouncement({
  title,
  body,
  audience,
  target_department_id,
  target_designation_id,
  target_department_ids,
  target_designation_ids,
  is_active,
  userId,
}) {
  const departmentIds = normalizeTargetIds(target_department_ids, target_department_id);
  const designationIds = normalizeTargetIds(target_designation_ids, target_designation_id);
  const result = await pool.query(
    `
      INSERT INTO public.announcements (
        title,
        body,
        audience,
        target_department_ids,
        target_designation_ids,
        is_active,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *
    `,
    [title, body, audience, departmentIds, designationIds, is_active ?? true, userId]
  );

  return result.rows[0];
}

export async function updateAnnouncement(id, payload, userId) {
  const fields = [];
  const values = [];

  const normalizedPayload = { ...payload };
  if (
    Object.prototype.hasOwnProperty.call(payload, 'target_department_ids') ||
    Object.prototype.hasOwnProperty.call(payload, 'target_department_id')
  ) {
    normalizedPayload.target_department_ids = normalizeTargetIds(payload.target_department_ids, payload.target_department_id);
    delete normalizedPayload.target_department_id;
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, 'target_designation_ids') ||
    Object.prototype.hasOwnProperty.call(payload, 'target_designation_id')
  ) {
    normalizedPayload.target_designation_ids = normalizeTargetIds(payload.target_designation_ids, payload.target_designation_id);
    delete normalizedPayload.target_designation_id;
  }

  for (const key of ['title', 'body', 'audience', 'target_department_ids', 'target_designation_ids', 'is_active']) {
    if (Object.prototype.hasOwnProperty.call(normalizedPayload, key)) {
      values.push(normalizedPayload[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) {
    const existing = await pool.query(`SELECT * FROM public.announcements WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Announcement not found.');
    }
    return existing.rows[0];
  }

  values.push(userId);
  values.push(id);

  const result = await pool.query(
    `
      UPDATE public.announcements
      SET ${fields.join(', ')}, updated_by = $${values.length - 1}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *
    `,
    values
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Announcement not found.');
  }

  return result.rows[0];
}

export async function getRoleName(roleId) {
  const result = await pool.query(`SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`, [roleId]);
  return result.rows[0]?.role_name || 'employee';
}
