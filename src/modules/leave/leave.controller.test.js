import { beforeEach, describe, expect, it, vi } from 'vitest';

const getRoleName = vi.hoisted(() => vi.fn());
const getMyLeaveRequests = vi.hoisted(() => vi.fn());
const getLeaveRequestsService = vi.hoisted(() => vi.fn());
const initializeYearlyBalances = vi.hoisted(() => vi.fn());
const getLeaveBalanceSummaryService = vi.hoisted(() => vi.fn());
const resolveDepartmentScope = vi.hoisted(() => vi.fn());

vi.mock('./leave.service.js', () => ({
  getRoleName,
  getMyLeaveRequests,
  getLeaveRequests: getLeaveRequestsService,
  initializeYearlyBalances,
  getLeaveBalanceSummary: getLeaveBalanceSummaryService,
}));

vi.mock('../department-scope/department-scope.service.js', () => ({
  resolveDepartmentScope,
}));

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('leave controller self-service', () => {
  beforeEach(() => {
    getRoleName.mockReset();
    getMyLeaveRequests.mockReset();
    getLeaveRequestsService.mockReset();
    initializeYearlyBalances.mockReset();
    getLeaveBalanceSummaryService.mockReset();
    resolveDepartmentScope.mockReset();
    resolveDepartmentScope.mockResolvedValue(null);
  });

  it('forces employee role leave list requests to the caller', async () => {
    getRoleName.mockResolvedValueOnce('employee');
    getMyLeaveRequests.mockResolvedValueOnce([{ id: 'leave-1', employee_id: 'EMP521' }]);
    resolveDepartmentScope.mockResolvedValueOnce(null);

    const { getLeaveRequests } = await import('./leave.controller.js');
    const req = {
      user: { role_id: 'employee-role', employee_id: 'EMP521' },
      query: { employee_id: 'EMP002' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await getLeaveRequests(req, res, next);

    expect(getMyLeaveRequests).toHaveBeenCalledWith('EMP521');
    expect(getLeaveRequestsService).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'leave-1', employee_id: 'EMP521' }],
    });
  });

  it('initializes all employee balances for an approved leave year', async () => {
    initializeYearlyBalances.mockResolvedValueOnce({
      year: 2027,
      employees_processed: 100,
      balances_created: 600,
    });

    const { initializeYearlyLeaveBalances } = await import('./leave.controller.js');
    const req = { body: { year: 2027 } };
    const res = mockResponse();
    const next = vi.fn();

    await initializeYearlyLeaveBalances(req, res, next);

    expect(initializeYearlyBalances).toHaveBeenCalledWith(2027);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { year: 2027, employees_processed: 100, balances_created: 600 },
    });
  });

  it('returns employee-level balance summaries with supported filters', async () => {
    getLeaveBalanceSummaryService.mockResolvedValueOnce([
      { employee_id: 'EMP001', total_remaining: 16 },
    ]);
    resolveDepartmentScope.mockResolvedValueOnce({
      department_id: 'department-id',
      work_location_id: 'location-id',
    });

    const { getLeaveBalanceSummary } = await import('./leave.controller.js');
    const req = {
      user: {
        role_id: 'role-head',
        user_id: 'user-head',
        employee_id: 'EMP900',
      },
      query: {
        department_id: 'department-id',
        location_id: 'location-id',
        shift_id: 'shift-id',
        year: '2026',
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    await getLeaveBalanceSummary(req, res, next);

    expect(getLeaveBalanceSummaryService).toHaveBeenCalledWith({
      department_id: 'department-id',
      location_id: 'location-id',
      shift_id: 'shift-id',
      year: 2026,
      scope: {
        department_id: 'department-id',
        work_location_id: 'location-id',
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ employee_id: 'EMP001', total_remaining: 16 }],
    });
  });
});
