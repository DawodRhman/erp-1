import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  login,
  logout,
  session,
  changePassword,
  loginSchema,
  changePasswordSchema,
} from './auth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', verifyToken, logout);
router.get('/session', verifyToken, session);
router.post('/change-password', verifyToken, validate(changePasswordSchema), changePassword);

export default router;
