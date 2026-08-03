import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import { buildAuditRequestContext, recordActivityLog } from '../audit/audit.service.js';
import * as authService from './auth.service.js';

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const DEV_JWT_SECRET = 'track360-dev-only-secret-change-before-production';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z
    .string()
    .min(8)
    .regex(passwordPolicy, 'Password must contain upper, lower, digit, and symbol.'),
});

function signToken(payload) {
  const secret = process.env.JWT_SECRET || DEV_JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production.');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function isHttpsRequest(req) {
  const forwardedProto = req.get?.('x-forwarded-proto') || req.headers?.['x-forwarded-proto'];
  return (
    req.secure === true ||
    String(forwardedProto || '').split(',')[0].trim() === 'https' ||
    process.env.NODE_ENV === 'production'
  );
}

function authCookieOptions(req, httpOnly) {
  const secure = isHttpsRequest(req);

  return {
    httpOnly,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    secure,
  };
}

export async function login(req, res, next) {
  try {
    const user = await authService.login(req.body.email, req.body.password);

    const payload = {
      user_id: user.user_id,
      employee_id: user.employee_id,
      role_id: user.role_id,
      must_change_password: user.must_change_password,
    };

    const token = signToken(payload);

    res.cookie('ems_jwt', token, authCookieOptions(req, true));

    res.cookie('ems_csrf', randomUUID(), authCookieOptions(req, false));

    await recordActivityLog({
      userId: user.user_id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'auth',
      entityId: user.employee_id,
      meta: {
        employee_id: user.employee_id,
        email: user.email,
        role_id: user.role_id,
      },
      requestContext: buildAuditRequestContext(req, {
        actor_user_id: user.user_id,
        actor_employee_id: user.employee_id,
        actor_role_id: user.role_id,
        actor_email: user.email,
      }),
      bestEffort: true,
    });

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          employee_id: user.employee_id,
          must_change_password: user.must_change_password,
        },
        token, // Return token for Bearer auth
      },
      200
    );
  } catch (error) {
    await recordActivityLog({
      userId: null,
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'auth',
      meta: {
        email: req.body?.email,
        error_code: error.code || error.name || 'LOGIN_FAILED',
      },
      requestContext: buildAuditRequestContext(req, {
        actor_email: req.body?.email,
      }),
      bestEffort: true,
    });
    return next(error);
  }
}

export async function logout(req, res) {
  await recordActivityLog({
    userId: req.user?.user_id,
    action: 'AUTH_LOGOUT',
    entityType: 'auth',
    entityId: req.user?.employee_id,
    meta: {
      employee_id: req.user?.employee_id,
      role_id: req.user?.role_id,
    },
    requestContext: buildAuditRequestContext(req),
    bestEffort: true,
  });

  res.clearCookie('ems_jwt', authCookieOptions(req, true));
  res.clearCookie('ems_csrf', authCookieOptions(req, false));
  return sendSuccess(res, null, 200);
}

export function session(req, res) {
  return sendSuccess(res, req.user, 200);
}

export async function getMyPermissions(req, res, next) {
  try {
    const result = await authService.getRolePermissions(req.user.role_id);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    await authService.changePassword(
      req.user.user_id,
      req.body.current_password,
      req.body.new_password
    );

    const newPayload = {
      user_id: req.user.user_id,
      employee_id: req.user.employee_id,
      role_id: req.user.role_id,
      must_change_password: false,
    };

    const token = signToken(newPayload);

    res.cookie('ems_jwt', token, authCookieOptions(req, true));

    await recordActivityLog({
      userId: req.user.user_id,
      action: 'AUTH_PASSWORD_CHANGED',
      entityType: 'auth',
      entityId: req.user.employee_id,
      meta: {
        employee_id: req.user.employee_id,
        role_id: req.user.role_id,
      },
      requestContext: buildAuditRequestContext(req),
      bestEffort: true,
    });

    return sendSuccess(res, { message: 'Password changed.' }, 200);
  } catch (error) {
    return next(error);
  }
}
