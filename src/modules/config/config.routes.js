import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  getConfigEntity,
  createConfigEntity,
  updateConfigEntity,
} from './config.controller.js';

const router = Router();

router.use(verifyToken);

const dynamicPermission = (action) => {
  return (req, res, next) => {
    let perm = `config:${action}`;
    if (req.params.entity === 'allowance-types') {
      perm = `allowances:${action}`;
    }
    requirePermission(perm)(req, res, next);
  };
};

router.get('/:entity', dynamicPermission('read'), getConfigEntity);
router.post('/:entity', dynamicPermission('write'), createConfigEntity);
router.patch('/:entity/:id', dynamicPermission('write'), updateConfigEntity);

export default router;
