import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveDepartmentScope = vi.hoisted(() => vi.fn());
const getAttendanceSheet = vi.hoisted(() => vi.fn());
const submitAttendanceCorrectionRequest = vi.hoisted(() => vi.fn());
const reviewAttendanceCorrectionRequest = vi.hoisted(() => vi.fn());
const sendSuccess = vi.hoisted(() => vi.fn());
const recordRequestActivity = vi.hoisted(() => vi.fn());

vi.mock('../department-scope/department-scope.service.js', () => ({
  resolveDepartmentScope,
}));

vi.mock('./attendance.service.js', () => ({
  getAttendanceSheet,
  submitAttendanceCorrectionRequest,
  reviewAttendanceCorrectionRequest,
}));

vi.mock('../../utils/respond.js', () => ({
  sendSuccess,
}));

vi.mock('../audit/audit.service.js', () => ({
  recordRequestActivity,
}));

describe('attendance controller', () => {
  beforeEach(() => {
    resolveDepartmentScope.mockReset();
    getAttendanceSheet.mockReset();
    submitAttendanceCorrectionRequest.mockReset();
    reviewAttendanceCorrectionRequest.mockReset();
    sendSuccess.mockReset();
    recordRequestActivity.mockReset();
  });

  it('passes Department Head scope into attendance sheet reads', async () => {
    const scope = { department_id: 'dept-1', work_location_id: 'loc-1' };
    resolveDepartmentScope.mockResolvedValueOnce(scope);
    getAttendanceSheet.mockResolvedValueOnce({ rows: [] });

    const { getAttendanceSheet: controller } = await import('./attendance.controller.js');
    const req = {
      query: { date: '2026-06-10', location_id: 'loc-1' },
      user: { role_id: 'role-head', user_id: 'user-head', employee_id: 'EMP0002' },
    };
    const res = {};
    const next = vi.fn();

    await controller(req, res, next);

    expect(getAttendanceSheet).toHaveBeenCalledWith(
      '2026-06-10',
      'loc-1',
      'EMP0002',
      'role-head',
      scope
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, { rows: [] }, 200);
    expect(next).not.toHaveBeenCalled();
  });

  it('records audit metadata when an employee submits an attendance correction request', async () => {
    submitAttendanceCorrectionRequest.mockResolvedValueOnce({
      id: 'correction-1',
      attendance_id: 'attendance-1',
      employee_id: 'EMP0007',
    });

    const { submitAttendanceCorrectionRequest: controller } = await import('./attendance.controller.js');
    const req = {
      body: {
        date: '2026-06-16',
        requested_check_in: '09:05',
        reason: 'Wrong time.',
      },
      user: { user_id: 'user-employee', employee_id: 'EMP0007', role_id: 'role-employee' },
    };
    const res = {};
    const next = vi.fn();

    await controller(req, res, next);

    expect(submitAttendanceCorrectionRequest).toHaveBeenCalledWith(
      req.body,
      'EMP0007',
      'user-employee'
    );
    expect(recordRequestActivity).toHaveBeenCalledWith(req, {
      action: 'ATTENDANCE_CORRECTION_REQUESTED',
      entityType: 'attendance_correction_requests',
      entityId: 'correction-1',
      meta: {
        correction_request_id: 'correction-1',
        attendance_id: 'attendance-1',
        employee_id: 'EMP0007',
        date: '2026-06-16',
      },
    });
    expect(sendSuccess).toHaveBeenCalledWith(res, {
      id: 'correction-1',
      attendance_id: 'attendance-1',
      employee_id: 'EMP0007',
    }, 201);
    expect(next).not.toHaveBeenCalled();
  });

  it('records an approval audit action when HR reviews a correction request', async () => {
    reviewAttendanceCorrectionRequest.mockResolvedValueOnce({
      id: 'correction-1',
      status: 'approved',
    });

    const { reviewAttendanceCorrectionRequest: controller } = await import('./attendance.controller.js');
    const req = {
      params: { id: 'correction-1' },
      body: { decision: 'approved', review_note: 'Verified.' },
      user: { user_id: 'hr-user', employee_id: 'EMP0016', role_id: 'role-hr' },
    };
    const res = {};
    const next = vi.fn();

    await controller(req, res, next);

    expect(reviewAttendanceCorrectionRequest).toHaveBeenCalledWith(
      'correction-1',
      req.body,
      'hr-user'
    );
    expect(recordRequestActivity).toHaveBeenCalledWith(req, {
      action: 'ATTENDANCE_CORRECTION_APPROVED',
      entityType: 'attendance_correction_requests',
      entityId: 'correction-1',
      meta: {
        correction_request_id: 'correction-1',
        decision: 'approved',
      },
    });
    expect(sendSuccess).toHaveBeenCalledWith(res, {
      id: 'correction-1',
      status: 'approved',
    }, 200);
    expect(next).not.toHaveBeenCalled();
  });
});
