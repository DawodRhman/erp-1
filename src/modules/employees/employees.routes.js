import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission, requirePermissionOrSelf } from '../../middleware/require-permission.js';
import { validate } from '../../middleware/validate.js';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updatePersonalInfo,
  updateJobInfo,
  updateExtraInfo,
  resendCredentials,
  addSalaryRevision,
  updateAllowances,
  getFinanceHistory,
} from './employees.controller.js';
import {
  createEmployeeSchema,
  updatePersonalInfoSchema,
  updateJobInfoSchema,
  updateExtraInfoSchema,
  salaryRevisionSchema,
  updateAllowancesSchema,
} from './employees.schema.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/',
  requirePermissionOrSelf('employees:read', 'employees:self_read', { paramKey: null }),
  getEmployees
);
router.get('/:employeeId', requirePermissionOrSelf('employees:read', 'employees:self_read'), getEmployeeById);
router.post('/', requirePermission('employees:write'), validate(createEmployeeSchema), createEmployee);
router.patch(
  '/:employeeId/personal',
  requirePermission('employees:write'),
  validate(updatePersonalInfoSchema),
  updatePersonalInfo
);
router.patch(
  '/:employeeId/job',
  requirePermission('employees:write'),
  validate(updateJobInfoSchema),
  updateJobInfo
);
router.patch(
  '/:employeeId/extra',
  requirePermission('employees:write'),
  validate(updateExtraInfoSchema),
  updateExtraInfo
);
router.post(
  '/:employeeId/resend-credentials',
  requirePermission('employees:write'),
  resendCredentials
);

// Finance Routes
router.get(
  '/:employeeId/finance',
  requirePermission('salary:read'),
  getFinanceHistory
);

router.post(
  '/:employeeId/salary-revision',
  requirePermission('salary:write'),
  validate(salaryRevisionSchema),
  addSalaryRevision
);

router.put(
  '/:employeeId/allowances',
  requirePermission('allowances:write'),
  validate(updateAllowancesSchema),
  updateAllowances
);

export default router;
