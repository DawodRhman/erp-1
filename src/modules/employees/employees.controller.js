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
    const result = await employeesService.updateExtraInfo(req.params.employeeId, req.body);
    return sendSuccess(res, result, 200);
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
