import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  getCredentialTemplate,
  listAccounts,
  updateAccountStatus,
  updateCredentialTemplate,
} from './accounts.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermission('config:read'), listAccounts);
router.patch('/:accountId/status', requirePermission('config:write'), updateAccountStatus);
router.get('/settings/credential-template', requirePermission('config:read'), getCredentialTemplate);
router.put('/settings/credential-template', requirePermission('config:write'), updateCredentialTemplate);

export default router;
