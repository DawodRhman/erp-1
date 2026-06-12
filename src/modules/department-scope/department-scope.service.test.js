import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

async function loadService() {
  vi.resetModules();
  return import('./department-scope.service.js');
}

describe('department scope service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('returns no scope for roles with company-wide access', async () => {
    query.mockResolvedValueOnce({ rows: [{ role_name: 'hr_manager' }] });

    const { resolveDepartmentScope } = await loadService();
    const scope = await resolveDepartmentScope({
      roleId: 'role-hr',
      userId: 'user-hr',
      employeeId: 'EMP0001',
    });

    expect(scope).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('uses an active Department Head assignment when one exists', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'department_head' }] })
      .mockResolvedValueOnce({
        rows: [{
          department_id: 'dept-engineering',
          work_location_id: 'location-lahore',
          source: 'assignment',
        }],
      });

    const { resolveDepartmentScope } = await loadService();
    const scope = await resolveDepartmentScope({
      roleId: 'role-head',
      userId: 'user-head',
      employeeId: 'EMP0020',
    });

    expect(scope).toEqual({
      role_name: 'department_head',
      department_id: 'dept-engineering',
      work_location_id: 'location-lahore',
      source: 'assignment',
    });
  });

  it('falls back to the Department Head current job assignment', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'department_head' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          department_id: 'dept-finance',
          work_location_id: 'location-karachi',
        }],
      });

    const { resolveDepartmentScope } = await loadService();
    const scope = await resolveDepartmentScope({
      roleId: 'role-head',
      userId: 'user-head',
      employeeId: 'EMP0030',
    });

    expect(scope).toEqual({
      role_name: 'department_head',
      department_id: 'dept-finance',
      work_location_id: 'location-karachi',
      source: 'job_info',
    });
  });

  it('rejects a Department Head account without a department scope', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'department_head' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { resolveDepartmentScope } = await loadService();

    await expect(resolveDepartmentScope({
      roleId: 'role-head',
      userId: 'user-head',
      employeeId: 'EMP0040',
    })).rejects.toMatchObject({
      statusCode: 403,
      code: 'DEPARTMENT_SCOPE_MISSING',
    });
  });

  it('rejects access to an employee outside the resolved department or location', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        department_id: 'dept-sales',
        work_location_id: 'location-islamabad',
      }],
    });

    const { assertEmployeeInScope } = await loadService();

    await expect(assertEmployeeInScope('EMP0099', {
      department_id: 'dept-engineering',
      work_location_id: 'location-islamabad',
    })).rejects.toMatchObject({
      statusCode: 403,
      code: 'OUTSIDE_DEPARTMENT_SCOPE',
    });
  });
});
