import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendError } from '../utils/respond.js';

const DEV_JWT_SECRET = 'track360-dev-only-secret-change-before-production';

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
    const secret = process.env.JWT_SECRET || DEV_JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      return sendError(res, 'SERVER_CONFIG_ERROR', 'JWT secret is not configured.', 500);
    }

    const decoded = jwt.verify(token, secret);
    const userResult = await pool.query(
      `
        SELECT id, email, employee_id, role_id, must_change_password, COALESCE(is_active, true) AS is_active
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
    if (currentUser.is_active === false) {
      return sendError(res, 'ACCOUNT_INACTIVE', 'This account is inactive. Contact HR or Super Admin.', 403);
    }

    req.user = {
      user_id: currentUser.id,
      employee_id: currentUser.employee_id,
      role_id: currentUser.role_id,
      must_change_password: currentUser.must_change_password,
      email: currentUser.email,
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
