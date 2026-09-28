import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  login,
  logout,
  session,
  getMyPermissions,
  changePassword,
  loginSchema,
  changePasswordSchema,
} from './auth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', verifyToken, logout);
router.get('/session', (req, res, next) => {
  console.log('[DEBUG] Session route hit, headers:', req.headers.authorization ? 'has auth header' : 'no auth header', 'cookies:', Object.keys(req.cookies || {}));
  next();
}, verifyToken, session);
router.get('/permissions', verifyToken, getMyPermissions);
router.post('/change-password', verifyToken, validate(changePasswordSchema), changePassword);

export default router;
