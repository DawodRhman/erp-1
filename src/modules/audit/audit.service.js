import pool from '../../config/db.js';

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, item]) => item !== undefined && item !== null && item !== '')
  );
}

function header(req, name) {
  return req?.get?.(name) || req?.headers?.[name.toLowerCase()];
}

function clientIp(req) {
  const forwardedFor = header(req, 'x-forwarded-for');
  if (forwardedFor) return String(forwardedFor).split(',')[0].trim();
  return req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || null;
}

export function buildAuditRequestContext(req, extra = {}) {
  return compactObject({
    ip_address: clientIp(req),
    user_agent: header(req, 'user-agent'),
    method: req?.method,
    path: req?.originalUrl || req?.url || req?.path,
    request_id: header(req, 'x-request-id') || header(req, 'x-correlation-id'),
    actor_user_id: req?.user?.user_id,
    actor_employee_id: req?.user?.employee_id,
    actor_role_id: req?.user?.role_id,
    actor_email: req?.user?.email,
    ...extra,
  });
}

export async function recordActivityLog({
  userId,
  action,
  entityType,
  entityId = null,
  meta = {},
  requestContext = {},
  db = pool,
  bestEffort = false,
}) {
  try {
    const auditMeta = compactObject({ ...(meta || {}), ...(requestContext || {}) });
    const result = await db.query(
      `
        INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, meta)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `,
      [userId || null, action, entityType || null, entityId || null, JSON.stringify(auditMeta)]
    );
    return result.rows[0];
  } catch (error) {
    if (bestEffort) return null;
    throw error;
  }
}

export async function recordRequestActivity(req, {
  action,
  entityType,
  entityId = null,
  meta = {},
  bestEffort = true,
}) {
  return recordActivityLog({
    userId: req?.user?.user_id || null,
    action,
    entityType,
    entityId,
    meta,
    requestContext: buildAuditRequestContext(req),
    bestEffort,
  });
}

export async function isSuperAdminRole(roleId) {
  if (!roleId) return false;
  const result = await pool.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );
  return result.rows[0]?.role_name === 'super_admin';
}

export async function listActivityLogs(filters = {}) {
  const params = [];
  const where = [];

  if (filters.action) {
    params.push(filters.action);
    where.push(`al.action = $${params.length}`);
  }

  if (filters.module) {
    params.push(filters.module);
    where.push(`al.entity_type = $${params.length}`);
  }

  if (filters.actor_user_id) {
    params.push(filters.actor_user_id);
    where.push(`al.user_id = $${params.length}`);
  }

  if (filters.actor_employee_id) {
    params.push(filters.actor_employee_id);
    where.push(`al.meta ->> 'actor_employee_id' = $${params.length}`);
  }

  if (filters.entity_id) {
    params.push(filters.entity_id);
    where.push(`al.entity_id = $${params.length}`);
  }

  if (filters.date_from) {
    params.push(filters.date_from);
    where.push(`al.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.date_to) {
    params.push(`${filters.date_to} 23:59:59`);
    where.push(`al.created_at <= $${params.length}::timestamptz`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(
      al.action ILIKE $${params.length}
      OR al.entity_type ILIKE $${params.length}
      OR al.entity_id ILIKE $${params.length}
      OR al.meta::text ILIKE $${params.length}
      OR u.email ILIKE $${params.length}
      OR ei.name ILIKE $${params.length}
    )`);
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const offset = (page - 1) * limit;
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  params.push(limit, offset);
  const result = await pool.query(
    `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.meta,
        al.created_at,
        u.email AS actor_email,
        u.employee_id AS actor_employee_id,
        r.role_name AS actor_role_name,
        ei.name AS actor_name,
        COUNT(*) OVER()::int AS total_count
      FROM public.activity_logs al
      LEFT JOIN public.users u ON u.id = al.user_id
      LEFT JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  const items = result.rows.map((row) => {
    const meta = row.meta || {};
    return {
      id: row.id,
      timestamp: row.created_at,
      user_id: row.user_id,
      user: row.actor_name || row.actor_email || meta.actor_email || meta.actor_employee_id || 'System',
      role: row.actor_role_name || meta.actor_role_id || 'Unknown',
      action: row.action,
      module: row.entity_type || 'system',
      recordId: row.entity_id || meta.employee_id || '-',
      summary: summarizeActivity(row.action, row.entity_type, row.entity_id, meta),
      ip_address: meta.ip_address || null,
      user_agent: meta.user_agent || null,
      method: meta.method || null,
      path: meta.path || null,
      request_id: meta.request_id || null,
      actor_user_id: meta.actor_user_id || row.user_id || null,
      actor_employee_id: meta.actor_employee_id || row.actor_employee_id || null,
      actor_role_id: meta.actor_role_id || null,
      actor_email: meta.actor_email || row.actor_email || null,
      meta,
      created_at: row.created_at,
    };
  });

  return {
    items,
    page,
    limit,
    total: result.rows[0]?.total_count || 0,
  };
}

function summarizeActivity(action, entityType, entityId, meta = {}) {
  const readableAction = String(action || 'ACTION').replaceAll('_', ' ').toLowerCase();
  const target = entityId || meta.employee_id || meta.account_user_id || '';
  return `${readableAction}${entityType ? ` in ${entityType}` : ''}${target ? ` for ${target}` : ''}.`;
}
