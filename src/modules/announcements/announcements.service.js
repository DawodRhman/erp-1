import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

function normalizeTargetIds(value, fallback) {
  const source = Array.isArray(value) ? value : fallback ? [fallback] : [];
  return [...new Set(source.filter(Boolean))];
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

export async function listAnnouncements({ activeOnly = true, roleName = 'employee', all = false, employeeId } = {}) {
  const filters = [];
  const params = [];
  const shouldScopeToEmployeeTargets = !all && roleName === 'employee' && employeeId;
  const includeReadReceipt = Boolean(employeeId);
  let employeeParamIndex = null;

  if (includeReadReceipt || shouldScopeToEmployeeTargets) {
    params.push(employeeId);
    employeeParamIndex = params.length;
  }

  if (activeOnly && !all) {
    filters.push('a.is_active = true');
  }

  if (!all) {
    filters.push('(a.expiry_date IS NULL OR a.expiry_date >= CURRENT_DATE)');
  }

  if (shouldScopeToEmployeeTargets) {
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
        ${includeReadReceipt ? ', receipt.read_at AS read_at, (receipt.id IS NOT NULL) AS is_read' : ', NULL::timestamptz AS read_at, false AS is_read'}
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
      ${includeReadReceipt ? `LEFT JOIN public.announcement_read_receipts receipt
        ON receipt.announcement_id = a.id
       AND receipt.employee_id = $${employeeParamIndex}` : ''}
      ${shouldScopeToEmployeeTargets ? `LEFT JOIN public.job_info viewer_job ON viewer_job.employee_id = $${employeeParamIndex}` : ''}
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
  expiry_date,
  target_department_id,
  target_designation_id,
  target_department_ids,
  target_designation_ids,
  is_active,
  userId,
  scope = null,
}) {
  const departmentIds = applyDepartmentScope(
    normalizeTargetIds(target_department_ids, target_department_id),
    scope
  );
  const designationIds = normalizeTargetIds(target_designation_ids, target_designation_id);
  if (scope) {
    await assertDesignationsInDepartments(designationIds, departmentIds);
  }

  const result = await pool.query(
    `
      INSERT INTO public.announcements (
        title,
        body,
        expiry_date,
        target_department_ids,
        target_designation_ids,
        is_active,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *
    `,
    [title, body, expiry_date || null, departmentIds, designationIds, is_active ?? true, userId]
  );

  return result.rows[0];
}

export async function updateAnnouncement(id, payload, userId, scope = null) {
  const fields = [];
  const values = [];

  const normalizedPayload = { ...payload };
  if (
    Object.prototype.hasOwnProperty.call(payload, 'target_department_ids') ||
    Object.prototype.hasOwnProperty.call(payload, 'target_department_id')
  ) {
    normalizedPayload.target_department_ids = applyDepartmentScope(
      normalizeTargetIds(payload.target_department_ids, payload.target_department_id),
      scope
    );
    delete normalizedPayload.target_department_id;
  }
  if (scope && !Object.prototype.hasOwnProperty.call(normalizedPayload, 'target_department_ids')) {
    normalizedPayload.target_department_ids = [scope.department_id];
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, 'target_designation_ids') ||
    Object.prototype.hasOwnProperty.call(payload, 'target_designation_id')
  ) {
    normalizedPayload.target_designation_ids = normalizeTargetIds(payload.target_designation_ids, payload.target_designation_id);
    delete normalizedPayload.target_designation_id;
  }

  if (scope) {
    await assertDesignationsInDepartments(
      normalizeTargetIds(normalizedPayload.target_designation_ids),
      normalizeTargetIds(normalizedPayload.target_department_ids)
    );
  }

  for (const key of ['title', 'body', 'expiry_date', 'target_department_ids', 'target_designation_ids', 'is_active']) {
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

export async function markAnnouncementRead(announcementId, { userId, employeeId } = {}) {
  const existing = await pool.query(
    `
      SELECT id
      FROM public.announcements
      WHERE id = $1
        AND is_active = true
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      LIMIT 1
    `,
    [announcementId]
  );

  if (existing.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Announcement not found or no longer active.');
  }

  const conflictTarget = employeeId
    ? '(announcement_id, employee_id)'
    : '(announcement_id, user_id)';

  const result = await pool.query(
    `
      INSERT INTO public.announcement_read_receipts (
        announcement_id,
        user_id,
        employee_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT ${conflictTarget}
      DO UPDATE SET read_at = public.announcement_read_receipts.read_at
      RETURNING *
    `,
    [announcementId, userId || null, employeeId || null]
  );

  return result.rows[0];
}

export async function getRoleName(roleId) {
  const result = await pool.query(`SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`, [roleId]);
  return result.rows[0]?.role_name || 'employee';
}
