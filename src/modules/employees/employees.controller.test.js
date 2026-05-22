import { beforeEach, describe, expect, it, vi } from 'vitest';

const getEmployeeById = vi.hoisted(() => vi.fn());
const getEmployeesService = vi.hoisted(() => vi.fn());

vi.mock('./employees.service.js', () => ({
  getEmployeeById,
  getEmployees: getEmployeesService,
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

describe('employees controller self-service', () => {
  beforeEach(() => {
    getEmployeeById.mockReset();
    getEmployeesService.mockReset();
  });

  it('returns the caller employee record when the route is self-scoped', async () => {
    getEmployeeById.mockResolvedValueOnce({ employee_id: 'EMP521', name: 'Self User' });

    const { getEmployees } = await import('./employees.controller.js');
    const req = {
      permissionScope: 'self',
      user: { employee_id: 'EMP521' },
      query: {},
    };
    const res = mockResponse();
    const next = vi.fn();

    await getEmployees(req, res, next);

    expect(getEmployeeById).toHaveBeenCalledWith('EMP521');
    expect(getEmployeesService).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { employee_id: 'EMP521', name: 'Self User' },
    });
  });
});
