import * as employeesService from './employees.service.js';
import { sendSuccess } from '../../utils/respond.js';

export async function createEmployee(req, res, next) {
  try {
    const result = await employeesService.createEmployee(req.body, req.user.user_id);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function getEmployees(req, res, next) {
  try {
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
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateJobInfo(req, res, next) {
  try {
    const result = await employeesService.updateJobInfo(req.params.employeeId, req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateExtraInfo(req, res, next) {
  try {
    const { emergencyContacts, bankInfo, medicalInfo } = req.body;
    const results = {};

    if (emergencyContacts) {
      results.emergencyContacts = await employeesService.updateEmergencyContacts(req.params.employeeId, emergencyContacts);
    }
    if (bankInfo) {
      results.bankInfo = await employeesService.updateBankInfo(req.params.employeeId, bankInfo);
    }
    if (medicalInfo) {
      results.medicalInfo = await employeesService.updateMedicalInfo(req.params.employeeId, medicalInfo);
    }

    return sendSuccess(res, results, 200);
  } catch (error) {
    return next(error);
  }
}


export async function resendCredentials(req, res, next) {
  try {
    const result = await employeesService.resendCredentials(req.params.employeeId);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function addSalaryRevision(req, res, next) {
  try {
    const result = await employeesService.addSalaryRevision(req.params.employeeId, req.body, req.user.user_id);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateAllowances(req, res, next) {
  try {
    const result = await employeesService.updateAllowances(req.params.employeeId, req.body.allowances, req.user.user_id);
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
