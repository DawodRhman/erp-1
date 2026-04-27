import pool from '../config/db.js';
import { sendError } from '../utils/respond.js';

const rolePermissionCache = new Map();

async function getPermissionsForRole(roleId) {
  if (rolePermissionCache.has(roleId)) {
    return rolePermissionCache.get(roleId);
  }

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
  rolePermissionCache.set(roleId, permissionSet);
  return permissionSet;
}

export function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.role_id;

      if (!roleId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
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
}
