import { beforeEach, describe, expect, it, vi } from 'vitest';

const getEmployeeById = vi.hoisted(() => vi.fn());
const getEmployeesService = vi.hoisted(() => vi.fn());
const resolveDepartmentScope = vi.hoisted(() => vi.fn());
const assertEmployeeInScope = vi.hoisted(() => vi.fn());

vi.mock('./employees.service.js', () => ({
  getEmployeeById,
  getEmployees: getEmployeesService,
}));

vi.mock('../department-scope/department-scope.service.js', () => ({
  resolveDepartmentScope,
  assertEmployeeInScope,
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
    resolveDepartmentScope.mockReset();
    assertEmployeeInScope.mockReset();
    resolveDepartmentScope.mockResolvedValue(null);
    assertEmployeeInScope.mockResolvedValue(undefined);
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

  it('returns full employee detail when a Department Head opens their own profile', async () => {
    getEmployeeById.mockResolvedValueOnce({
      employee_id: 'EMP0034',
      employeeContact: { primary_phone: '03529254087' },
      salaryInfo: { base_salary: 92570 },
    });

    const { getEmployeeById: getEmployeeDetail } = await import('./employees.controller.js');
    const req = {
      params: { employeeId: 'EMP0034' },
      user: {
        user_id: 'user-34',
        employee_id: 'EMP0034',
        role_id: 'department-head-role',
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    await getEmployeeDetail(req, res, next);

    expect(resolveDepartmentScope).not.toHaveBeenCalled();
    expect(getEmployeeById).toHaveBeenCalledWith('EMP0034', { scope: null });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses department-only scope for Department Head employee lists', async () => {
    resolveDepartmentScope.mockResolvedValueOnce({
      department_id: 'backend-dept',
      work_location_id: 'head-office',
    });
    getEmployeesService.mockResolvedValueOnce({ data: [], meta: {} });

    const { getEmployees } = await import('./employees.controller.js');
    const req = {
      user: {
        user_id: 'user-34',
        employee_id: 'EMP0034',
        role_id: 'department-head-role',
      },
      query: {},
    };
    const res = mockResponse();
    const next = vi.fn();

    await getEmployees(req, res, next);

    expect(getEmployeesService).toHaveBeenCalledWith(expect.objectContaining({
      scope: {
        department_id: 'backend-dept',
        work_location_id: null,
      },
    }));
  });

  it('checks department scope before returning finance history', async () => {
    resolveDepartmentScope.mockResolvedValueOnce({
      department_id: 'backend-dept',
      work_location_id: 'head-office',
    });

    const { getFinanceHistory } = await import('./employees.controller.js');
    const req = {
      params: { employeeId: 'EMP0035' },
      permissionScope: 'all',
      user: {
        user_id: 'user-34',
        employee_id: 'EMP0034',
        role_id: 'department-head-role',
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    await getFinanceHistory(req, res, next);

    expect(resolveDepartmentScope).toHaveBeenCalled();
    expect(assertEmployeeInScope).toHaveBeenCalledWith('EMP0035', {
      department_id: 'backend-dept',
      work_location_id: null,
    });
  });
});
