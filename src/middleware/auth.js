import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendError } from '../utils/respond.js';

export async function verifyToken(req, res, next) {
  // Check both cookie and Authorization header
  let token = req.cookies?.ems_jwt;
  let source = 'cookie';

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      source = 'header';
    }
  }

  console.log(`[AUTH DEBUG] Request to ${req.originalUrl} | Token found: ${!!token} | Source: ${source}`);

  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await pool.query(
      `
        SELECT id, employee_id, role_id, must_change_password
        FROM public.users
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.user_id]
    );

    if (userResult.rowCount === 0) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token.', 401);
    }

    const currentUser = userResult.rows[0];
    req.user = {
      user_id: currentUser.id,
      employee_id: currentUser.employee_id,
      role_id: currentUser.role_id,
      must_change_password: currentUser.must_change_password,
    };

    const isChangePasswordRoute =
      req.method === 'POST' &&
      (req.path === '/change-password' ||
        req.originalUrl?.endsWith('/api/auth/change-password'));

    if (req.user.must_change_password === true && !isChangePasswordRoute) {
      return sendError(
        res,
        'MUST_CHANGE_PASSWORD',
        'Password must be changed before continuing.',
        403
      );
    }

    return next();
  } catch {
    return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token.', 401);
  }
}

verifyToken.__auth = true;
