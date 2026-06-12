import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveDepartmentScope = vi.hoisted(() => vi.fn());
const getAttendanceSheet = vi.hoisted(() => vi.fn());
const sendSuccess = vi.hoisted(() => vi.fn());

vi.mock('../department-scope/department-scope.service.js', () => ({
  resolveDepartmentScope,
}));

vi.mock('./attendance.service.js', () => ({
  getAttendanceSheet,
}));

vi.mock('../../utils/respond.js', () => ({
  sendSuccess,
}));

describe('attendance controller', () => {
  beforeEach(() => {
    resolveDepartmentScope.mockReset();
    getAttendanceSheet.mockReset();
    sendSuccess.mockReset();
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
});
