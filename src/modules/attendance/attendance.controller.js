import { sendSuccess } from '../../utils/respond.js';
import * as attendanceService from './attendance.service.js';
import { recordRequestActivity } from '../audit/audit.service.js';

export async function getAttendanceSheet(req, res, next) {
  try {
    const result = await attendanceService.getAttendanceSheet(
      req.query.date,
      req.query.location_id,
      req.user.employee_id,
      req.user.role_id
    );
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function saveAttendanceSheet(req, res, next) {
  try {
    const result = await attendanceService.saveAttendanceSheet(
      req.body.date,
      req.body.location_id,
      req.body.rows,
      req.user.user_id
    );
    await recordRequestActivity(req, {
      action: 'ATTENDANCE_SHEET_SAVED',
      entityType: 'attendance',
      meta: { date: req.body.date, location_id: req.body.location_id, row_count: req.body.rows?.length || 0 },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function acknowledgeAttendance(req, res, next) {
  try {
    const result = await attendanceService.acknowledgeAttendance(
      req.params.id,
      req.user.employee_id
    );
    await recordRequestActivity(req, {
      action: 'ATTENDANCE_ACKNOWLEDGED',
      entityType: 'attendance',
      entityId: req.params.id,
      meta: { attendance_id: req.params.id, employee_id: req.user.employee_id },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function submitSheetToHO(req, res, next) {
  try {
    const result = await attendanceService.submitSheetToHO(
      req.body.date,
      req.body.location_id,
      req.user.user_id
    );
    await recordRequestActivity(req, {
      action: 'ATTENDANCE_SHEET_SUBMITTED',
      entityType: 'attendance',
      meta: { date: req.body.date, location_id: req.body.location_id },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function requestUnlock(req, res, next) {
  try {
    const result = await attendanceService.requestUnlock(
      req.body.date,
      req.body.location_id,
      req.body.reason,
      req.user.user_id
    );
    await recordRequestActivity(req, {
      action: 'ATTENDANCE_UNLOCK_REQUESTED',
      entityType: 'attendance',
      meta: { date: req.body.date, location_id: req.body.location_id, reason: req.body.reason || null },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function approveUnlock(req, res, next) {
  try {
    const result = await attendanceService.approveUnlock(
      req.body.date,
      req.body.location_id,
      req.user.user_id,
      req.body.unlock_reason
    );
    await recordRequestActivity(req, {
      action: 'ATTENDANCE_UNLOCK_APPROVED',
      entityType: 'attendance',
      meta: { date: req.body.date, location_id: req.body.location_id, unlock_reason: req.body.unlock_reason || null },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function getMonthlyReport(req, res, next) {
  try {
    const now = new Date();
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    const result = await attendanceService.getMonthlyReport(
      Number.isNaN(year) ? now.getFullYear() : year,
      Number.isNaN(month) ? now.getMonth() + 1 : month,
      req.query.location_id,
      {
        employee_id: req.query.employee_id,
        department_id: req.query.department_id,
      },
      req.user.employee_id,
      req.user.role_id
    );
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
