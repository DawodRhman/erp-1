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
  createEmployeeAccount,
  addSalaryRevision,
  updateAllowances,
  getFinanceHistory,
} from './employees.controller.js';
import {
  bulkUpload,
  downloadBulkTemplate,
  importBulkEmployeesController,
  revalidateBulkEmployeeRows,
  validateBulkEmployees,
} from './employees.bulk.controller.js';
import {
  attachmentUpload,
  getEmployeeAttachments,
  uploadAttachment,
} from './employees.attachments.controller.js';
import {
  createEmployeeSchema,
  updatePersonalInfoSchema,
  updateJobInfoSchema,
  updateExtraInfoSchema,
  salaryRevisionSchema,
  updateAllowancesSchema,
  createEmployeeAccountSchema,
} from './employees.schema.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/',
  requirePermissionOrSelf(
    ['employees:read', 'employees:department_read'],
    'employees:self_read',
    { paramKey: null }
  ),
  getEmployees
);
router.get(
  '/bulk/template',
  requirePermission('employees:write'),
  downloadBulkTemplate
);
router.post(
  '/bulk/validate',
  requirePermission('employees:write'),
  bulkUpload.single('file'),
  validateBulkEmployees
);
router.post(
  '/bulk/revalidate',
  requirePermission('employees:write'),
  revalidateBulkEmployeeRows
);
router.post(
  '/bulk/import',
  requirePermission('employees:write'),
  importBulkEmployeesController
);
router.get(
  '/:employeeId',
  requirePermissionOrSelf(
    ['employees:read', 'employees:department_read'],
    'employees:self_read'
  ),
  getEmployeeById
);
router.get(
  '/:employeeId/attachments',
  requirePermissionOrSelf('employee_attachments:read', 'employees:self_read'),
  getEmployeeAttachments
);
router.post(
  '/:employeeId/attachments',
  requirePermission('employee_attachments:upload'),
  attachmentUpload.single('file'),
  uploadAttachment
);
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
router.post(
  '/:employeeId/account',
  requirePermission('employees:write'),
  validate(createEmployeeAccountSchema),
  createEmployeeAccount
);

// Finance Routes
router.get(
  '/:employeeId/finance',
  requirePermissionOrSelf('salary:read', 'employees:self_read'),
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
