import pool from '../config/db.js';
import { sendError } from '../utils/respond.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

const rolePermissionCache = new Map();
const roleNameCache = new Map();

function cacheGet(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(map, key, value) {
  map.set(key, { value, timestamp: Date.now() });
}

async function getRoleName(roleId) {
  const cached = cacheGet(roleNameCache, roleId);
  if (cached !== null) return cached;

  const result = await pool.query(
    `SELECT role_name FROM public.roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );

  const roleName = result.rows[0]?.role_name || null;
  cacheSet(roleNameCache, roleId, roleName);
  return roleName;
}

async function getPermissionsForRole(roleId) {
  const cached = cacheGet(rolePermissionCache, roleId);
  if (cached !== null) return cached;

  const result = await pool.query(
    `
      SELECT p.permission_key
      FROM public.role_permissions rp
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `,
    [roleId]
  );

  const permissionSet = new Set(result.rows.map((row) => row.permission_key));
  cacheSet(rolePermissionCache, roleId, permissionSet);
  return permissionSet;
}

export function requirePermission(permissionKey) {
  const middleware = async (req, res, next) => {
    try {
      const roleId = req.user?.role_id;

      if (!roleId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
      }

      const roleName = await getRoleName(roleId);
      if (roleName === 'super_admin') {
        return next();
      }

      const permissions = await getPermissionsForRole(roleId);
      if (!permissions.has(permissionKey)) {
        return sendError(res, 'FORBIDDEN', 'Insufficient permissions.', 403);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

  middleware.__perm = { mode: 'all', keys: [permissionKey] };
  return middleware;
}

export function requireAnyPermission(...permissionKeys) {
  const keys = permissionKeys.flat().filter(Boolean);
  const middleware = async (req, res, next) => {
    try {
      const roleId = req.user?.role_id;

      if (!roleId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
      }

      const roleName = await getRoleName(roleId);
      if (roleName === 'super_admin') {
        return next();
      }

      const permissions = await getPermissionsForRole(roleId);
      if (!keys.some((key) => permissions.has(key))) {
        return sendError(res, 'FORBIDDEN', 'Insufficient permissions.', 403);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

  middleware.__perm = { mode: 'any', keys };
  return middleware;
}

export function requirePermissionOrSelf(permissionKey, selfPermissionKey, options = {}) {
  const { paramKey = 'employeeId' } = options;
  const fullPermissionKeys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];

  const middleware = async (req, res, next) => {
    try {
      const roleId = req.user?.role_id;

      if (!roleId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
      }

      const roleName = await getRoleName(roleId);
      if (roleName === 'super_admin') {
        return next();
      }

      const permissions = await getPermissionsForRole(roleId);
      if (fullPermissionKeys.some((key) => permissions.has(key))) {
        req.permissionScope = 'all';
        return next();
      }

      const requestedEmployeeId = req.params?.[paramKey];
      const callerEmployeeId = req.user?.employee_id;
      const canReadSelf =
        permissions.has(selfPermissionKey) &&
        callerEmployeeId &&
        (paramKey === null || (requestedEmployeeId && requestedEmployeeId === callerEmployeeId));

      if (!canReadSelf) {
        return sendError(res, 'FORBIDDEN', 'Insufficient permissions.', 403);
      }

      req.permissionScope = 'self';
      return next();
    } catch (error) {
      return next(error);
    }
  };

  middleware.__perm = { mode: 'any', keys: [...fullPermissionKeys, selfPermissionKey] };
  return middleware;
}
