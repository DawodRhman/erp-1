import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import {
  getPenaltyRules,
  createPenaltyRule,
  updatePenaltyRule,
  getPenalties,
  getMyPenalties,
  proposePenalty,
  approvePenalty,
  rejectPenalty,
  acknowledgePenalty,
} from './penalties.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/penalty-rules', requirePermission('penalties:propose'), getPenaltyRules);
router.post('/penalty-rules', requirePermission('penalty_rules:write'), createPenaltyRule);
router.patch('/penalty-rules/:id', requirePermission('penalty_rules:write'), updatePenaltyRule);

router.get('/penalties', requirePermission('penalties:read_all'), getPenalties);
router.get('/penalties/mine', requirePermission('penalties:read_own'), getMyPenalties);
router.post('/penalties', requirePermission('penalties:propose'), proposePenalty);
router.patch('/penalties/:id/approve', requirePermission('penalties:review'), approvePenalty);
router.patch('/penalties/:id/reject', requirePermission('penalties:review'), rejectPenalty);
router.patch('/penalties/:id/ack', acknowledgePenalty);

export default router;
