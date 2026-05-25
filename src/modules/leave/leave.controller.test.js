import { beforeEach, describe, expect, it, vi } from 'vitest';

const getRoleName = vi.hoisted(() => vi.fn());
const getMyLeaveRequests = vi.hoisted(() => vi.fn());
const getLeaveRequestsService = vi.hoisted(() => vi.fn());
const initializeYearlyBalances = vi.hoisted(() => vi.fn());

vi.mock('./leave.service.js', () => ({
  getRoleName,
  getMyLeaveRequests,
  getLeaveRequests: getLeaveRequestsService,
  initializeYearlyBalances,
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
  });

  it('forces employee role leave list requests to the caller', async () => {
    getRoleName.mockResolvedValueOnce('employee');
    getMyLeaveRequests.mockResolvedValueOnce([{ id: 'leave-1', employee_id: 'EMP521' }]);

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
});
