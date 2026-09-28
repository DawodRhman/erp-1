import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

const entityConfig = {
  departments: {
    table: 'departments',
    createFields: ['department_code', 'department_name', 'parent_department_id', 'is_active'],
    updateFields: ['department_code', 'department_name', 'parent_department_id', 'is_active'],
  },
  designations: {
    table: 'designations',
    createFields: ['title', 'department_id', 'is_active'],
    updateFields: ['title', 'department_id', 'is_active'],
  },
  'employment-types': {
    table: 'employment_types',
    createFields: ['type_name', 'is_active'],
    updateFields: ['type_name', 'is_active'],
  },
  'job-statuses': {
    table: 'job_statuses',
    createFields: ['status_name', 'is_active'],
    updateFields: ['status_name', 'is_active'],
  },
  'work-modes': {
    table: 'work_modes',
    createFields: ['mode_name', 'is_active'],
    updateFields: ['mode_name', 'is_active'],
  },
  'work-locations': {
    table: 'work_locations',
    createFields: ['location_name', 'is_active'],
    updateFields: ['location_name', 'is_active'],
  },
  shifts: {
    table: 'shifts',
    createFields: ['name', 'start_time', 'end_time', 'late_after_minutes', 'is_active'],
    updateFields: ['name', 'start_time', 'end_time', 'late_after_minutes', 'is_active'],
  },
  'leave-types': {
    table: 'leave_types',
    createFields: ['name', 'is_active'],
    updateFields: ['name', 'is_active'],
  },
  'leave-policies': {
    table: 'leave_policies',
    createFields: ['department_id', 'leave_type_id', 'days_allowed', 'year', 'is_active'],
    updateFields: ['department_id', 'leave_type_id', 'days_allowed', 'year', 'is_active'],
  },
  'leave-capacity': {
    table: 'leave_capacity_config',
    createFields: ['department_id', 'max_percent', 'is_active'],
    updateFields: ['department_id', 'max_percent', 'is_active'],
  },
  'penalty-rules': {
    table: 'penalty_rules',
    createFields: ['name', 'amount_pkr', 'type', 'is_active'],
    updateFields: ['name', 'amount_pkr', 'type', 'is_active'],
  },
  'allowance-types': {
    table: 'allowance_types',
    createFields: ['field_name', 'is_active'],
    updateFields: ['field_name', 'is_active'],
  },
  roles: {
    table: 'roles',
    createFields: ['department_id', 'role_name', 'description'],
    updateFields: ['department_id', 'role_name', 'description'],
    hasIsActive: false,
    hasUpdatedAt: false,
    orderBy: 'role_name ASC',
  },
  locations: {
    table: 'employee_locations',
    createFields: ['kind', 'country', 'province', 'name', 'is_active'],
    updateFields: ['kind', 'country', 'province', 'name', 'is_active'],
    orderBy: 'kind ASC, province ASC NULLS FIRST, name ASC',
  },
};

function getEntityConfig(entity) {
  const config = entityConfig[entity];
  if (!config) {
    throw new AppError(404, 'NOT_FOUND', 'Config entity not found.');
  }
  return config;
}

function pickFields(payload, fields) {
  const out = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      out[field] = payload[field];
    }
  }
  return out;
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeLocationInput(payload, existing = {}) {
  const kind = trimString(payload.kind ?? existing.kind);
  const country = 'Pakistan';
  const rawProvince = kind === 'province' ? null : trimString(payload.province ?? existing.province);
  const province = rawProvince || null;
  const name = trimString(payload.name ?? existing.name);
  const isActive = Object.prototype.hasOwnProperty.call(payload, 'is_active')
    ? payload.is_active !== false
    : existing.is_active !== false;

  if (!['province', 'district', 'city', 'town'].includes(kind)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Location kind must be province, district, city, or town.');
  }

  if (!name) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Location name is mandatory.');
  }

  if (kind !== 'province' && !province) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Province is mandatory for district, city, and town options.');
  }

  return { kind, country, province, name, is_active: isActive };
}

async function assertUniqueLocation({ kind, country, province, name }, idToExclude = null) {
  const params = [kind, country, name, province];
  let excludeSql = '';
  if (idToExclude) {
    params.push(idToExclude);
    excludeSql = `AND id <> $${params.length}`;
  }

  const duplicate = await pool.query(
    `
      SELECT 1
      FROM public.employee_locations
      WHERE kind = $1
        AND country = $2
        AND LOWER(name) = LOWER($3)
        AND COALESCE(province, '') = COALESCE($4, '')
        ${excludeSql}
      LIMIT 1
    `,
    params
  );

  if (duplicate.rowCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Location option already exists.');
  }
}

function handleLocationWriteError(error) {
  if (error?.code === '23505') {
    throw new AppError(409, 'CONFLICT', 'Location option already exists.');
  }
  if (error?.code === '23514') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Location option violates Pakistan location rules.');
  }
  throw error;
}

export async function isSuperAdmin(roleId) {
  const result = await pool.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );

  return result.rows[0]?.role_name === 'super_admin';
}

export async function getDepartments({ includeInactive = false } = {}) {
  const result = await pool.query(
    `
      SELECT *
      FROM public.departments
      WHERE ($1::boolean = true OR is_active = true)
      ORDER BY is_active DESC, department_name ASC
    `,
    [includeInactive]
  );

  return result.rows;
}

export async function createDepartment({
  department_code,
  department_name,
  parent_department_id,
  is_active = true,
}) {
  const duplicate = await pool.query(
    `SELECT 1 FROM public.departments WHERE department_code = $1 LIMIT 1`,
    [department_code]
  );

  if (duplicate.rowCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Department code already exists.');
  }

  const result = await pool.query(
    `
      INSERT INTO public.departments (
        department_code,
        department_name,
        parent_department_id,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [department_code, department_name, parent_department_id || null, is_active]
  );

  return result.rows[0];
}

export async function updateDepartment(id, data) {
  const updates = [];
  const params = [];
  const allowedFields = ['department_code', 'department_name', 'parent_department_id', 'is_active'];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      params.push(data[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    const existing = await pool.query(`SELECT * FROM public.departments WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Department not found.');
    }
    return existing.rows[0];
  }

  params.push(id);
  const result = await pool.query(
    `
      UPDATE public.departments
      SET ${updates.join(', ')}, updated_at = now()
      WHERE id = $${params.length}
      RETURNING *
    `,
    params
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Department not found.');
  }

  return result.rows[0];
}

export async function getEntityRecords(entity, { isSuperAdminCaller, includeInactive = false, filters = {} }) {
  const shouldIncludeInactive = Boolean(isSuperAdminCaller || includeInactive);

  if (entity === 'departments') {
    return getDepartments({ includeInactive: shouldIncludeInactive });
  }

  const { table, hasIsActive = true, orderBy = 'created_at DESC' } = getEntityConfig(entity);
  const whereParts = [];
  const params = [];

  if (entity === 'roles') {
    whereParts.push(`role_name <> 'installer'`);
  }

  if (hasIsActive) {
    params.push(shouldIncludeInactive);
    whereParts.push(`($${params.length}::boolean = true OR is_active = true)`);
  }

  if (entity === 'designations' && filters.department_id) {
    params.push(filters.department_id);
    whereParts.push(`department_id = $${params.length}`);
  }

  if (entity === 'locations') {
    if (filters.kind) {
      params.push(trimString(filters.kind));
      whereParts.push(`kind = $${params.length}`);
    }
    if (filters.country) {
      params.push('Pakistan');
      whereParts.push(`country = $${params.length}`);
    } else {
      whereParts.push(`country = 'Pakistan'`);
    }
    if (filters.province) {
      params.push(trimString(filters.province));
      whereParts.push(`province = $${params.length}`);
    }
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pool.query(
    `
      SELECT *
      FROM public.${table}
      ${whereSql}
      ORDER BY ${hasIsActive ? 'is_active DESC, ' : ''}${orderBy}
    `,
    params
  );

  return result.rows;
}

export async function createEntityRecord(entity, payload) {
  if (entity === 'departments') {
    return createDepartment(payload);
  }

  if (entity === 'roles' && String(payload.role_name || '').trim().toLowerCase() === 'installer') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Installer is handled inside Inventory operations and is not a separate login portal role.');
  }

  if (entity === 'locations') {
    const location = normalizeLocationInput(payload);
    await assertUniqueLocation(location);

    try {
      const result = await pool.query(
        `
          INSERT INTO public.employee_locations (kind, country, province, name, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [location.kind, location.country, location.province, location.name, location.is_active]
      );

      return result.rows[0];
    } catch (error) {
      handleLocationWriteError(error);
    }
  }

  const { table, createFields } = getEntityConfig(entity);
  const data = pickFields(payload, createFields);

  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'No fields provided for creation.');
  }

  const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');

  const result = await pool.query(
    `
      INSERT INTO public.${table} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `,
    values
  );

  return result.rows[0];
}

export async function updateEntityRecord(entity, id, payload) {
  if (entity === 'departments') {
    return updateDepartment(id, payload);
  }

  if (entity === 'roles' && String(payload.role_name || '').trim().toLowerCase() === 'installer') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Installer is handled inside Inventory operations and is not a separate login portal role.');
  }

  if (entity === 'locations') {
    const existing = await pool.query(`SELECT * FROM public.employee_locations WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Record not found.');
    }

    const location = normalizeLocationInput(payload, existing.rows[0]);
    await assertUniqueLocation(location, id);

    try {
      const result = await pool.query(
        `
          UPDATE public.employee_locations
          SET kind = $1,
              country = $2,
              province = $3,
              name = $4,
              is_active = $5,
              updated_at = now()
          WHERE id = $6
          RETURNING *
        `,
        [location.kind, location.country, location.province, location.name, location.is_active, id]
      );

      return result.rows[0];
    } catch (error) {
      handleLocationWriteError(error);
    }
  }

  const { table, updateFields, hasUpdatedAt = true } = getEntityConfig(entity);
  const data = pickFields(payload, updateFields);

  const fields = Object.keys(data);
  if (fields.length === 0) {
    const existing = await pool.query(`SELECT * FROM public.${table} WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Record not found.');
    }
    return existing.rows[0];
  }

  const values = Object.values(data);
  const updates = fields.map((field, idx) => `${field} = $${idx + 1}`);

  values.push(id);

  const result = await pool.query(
    `
      UPDATE public.${table}
      SET ${updates.join(', ')}${hasUpdatedAt ? ', updated_at = now()' : ''}
      WHERE id = $${values.length}
      RETURNING *
    `,
    values
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Record not found.');
  }

  return result.rows[0];
}
