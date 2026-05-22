import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../config/db.js', () => ({
  default: { query },
  pool: { query },
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

async function loadMiddleware() {
  vi.resetModules();
  return import('./require-permission.js');
}

describe('requirePermissionOrSelf', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('allows a user with self-read permission to read their own employee profile', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({ rows: [{ permission_key: 'employees:self_read' }] });

    const { requirePermissionOrSelf } = await loadMiddleware();
    const middleware = requirePermissionOrSelf('employees:read', 'employees:self_read');
    const req = {
      user: { role_id: 'role-1', employee_id: 'EMP521' },
      params: { employeeId: 'EMP521' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('forbids a user with self-read permission from reading another employee profile', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({ rows: [{ permission_key: 'employees:self_read' }] });

    const { requirePermissionOrSelf } = await loadMiddleware();
    const middleware = requirePermissionOrSelf('employees:read', 'employees:self_read');
    const req = {
      user: { role_id: 'role-1', employee_id: 'EMP521' },
      params: { employeeId: 'EMP002' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
      },
    });
  });

  it('allows a user with full read permission to read another employee profile', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'hr_executive' }] })
      .mockResolvedValueOnce({ rows: [{ permission_key: 'employees:read' }] });

    const { requirePermissionOrSelf } = await loadMiddleware();
    const middleware = requirePermissionOrSelf('employees:read', 'employees:self_read');
    const req = {
      user: { role_id: 'role-2', employee_id: 'EMP521' },
      params: { employeeId: 'EMP002' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a user with self-read permission through a self-scoped list route', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({ rows: [{ permission_key: 'employees:self_read' }] });

    const { requirePermissionOrSelf } = await loadMiddleware();
    const middleware = requirePermissionOrSelf('employees:read', 'employees:self_read', {
      paramKey: null,
    });
    const req = {
      user: { role_id: 'role-1', employee_id: 'EMP521' },
      params: {},
    };
    const res = mockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.permissionScope).toBe('self');
    expect(res.status).not.toHaveBeenCalled();
  });
});
