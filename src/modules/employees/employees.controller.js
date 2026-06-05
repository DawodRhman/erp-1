import * as employeesService from './employees.service.js';
import { sendSuccess } from '../../utils/respond.js';
import { buildAuditRequestContext, recordRequestActivity } from '../audit/audit.service.js';

export async function createEmployee(req, res, next) {
  try {
    const result = await employeesService.createEmployee(req.body, req.user.user_id);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_CREATED',
      entityType: 'employees',
      entityId: result?.employee?.employee_id || req.body.employee_id,
      meta: { employee_id: result?.employee?.employee_id || req.body.employee_id },
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function getEmployees(req, res, next) {
  try {
    if (req.permissionScope === 'self') {
      const result = await employeesService.getEmployeeById(req.user.employee_id);
      return sendSuccess(res, result, 200);
    }

    const result = await employeesService.getEmployees({
      search: req.query.search,
      department_id: req.query.department_id,
      is_active:
        req.query.is_active === undefined
          ? undefined
          : req.query.is_active === 'true',
      page: req.query.page,
      limit: req.query.limit,
    });

    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function getEmployeeById(req, res, next) {
  try {
    const result = await employeesService.getEmployeeById(req.params.employeeId);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updatePersonalInfo(req, res, next) {
  try {
    const result = await employeesService.updatePersonalInfo(req.params.employeeId, req.body);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_PERSONAL_UPDATED',
      entityType: 'employees',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId, updated_fields: Object.keys(req.body || {}) },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateJobInfo(req, res, next) {
  try {
    const result = await employeesService.updateJobInfo(req.params.employeeId, req.body);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_JOB_UPDATED',
      entityType: 'employees',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId, updated_fields: Object.keys(req.body || {}) },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateExtraInfo(req, res, next) {
  try {
    const { employeeContact, emergencyContacts, bankInfo, medicalInfo } = req.body;
    const results = {};

    if (employeeContact) {
      results.employeeContact = await employeesService.updateEmployeeContact(req.params.employeeId, employeeContact);
    }
    if (emergencyContacts) {
      results.emergencyContacts = await employeesService.updateEmergencyContacts(req.params.employeeId, emergencyContacts);
    }
    if (bankInfo) {
      results.bankInfo = await employeesService.updateBankInfo(req.params.employeeId, bankInfo);
    }
    if (medicalInfo) {
      results.medicalInfo = await employeesService.updateMedicalInfo(req.params.employeeId, medicalInfo);
    }

    await recordRequestActivity(req, {
      action: 'EMPLOYEE_EXTRA_UPDATED',
      entityType: 'employees',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId, sections: Object.keys(results) },
    });
    return sendSuccess(res, results, 200);
  } catch (error) {
    return next(error);
  }
}


export async function resendCredentials(req, res, next) {
  try {
    const result = await employeesService.resendCredentials(req.params.employeeId);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_CREDENTIALS_RESET',
      entityType: 'employees',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function createEmployeeAccount(req, res, next) {
  try {
    const result = await employeesService.createEmployeeAccount(
      req.params.employeeId,
      req.body,
      req.user.user_id,
      buildAuditRequestContext(req)
    );
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function addSalaryRevision(req, res, next) {
  try {
    const result = await employeesService.addSalaryRevision(req.params.employeeId, req.body, req.user.user_id);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_SALARY_REVISION_ADDED',
      entityType: 'employee_salary',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId, salary_revision_id: result?.id || null },
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateAllowances(req, res, next) {
  try {
    const result = await employeesService.updateAllowances(req.params.employeeId, req.body.allowances, req.user.user_id);
    await recordRequestActivity(req, {
      action: 'EMPLOYEE_ALLOWANCES_UPDATED',
      entityType: 'employee_allowances',
      entityId: req.params.employeeId,
      meta: { employee_id: req.params.employeeId, allowance_count: req.body.allowances?.length || 0 },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function getFinanceHistory(req, res, next) {
  try {
    const result = await employeesService.getEmployeeFinanceHistory(req.params.employeeId);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
