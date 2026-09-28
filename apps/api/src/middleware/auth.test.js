import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

async function loadAuth() {
  vi.resetModules();
  return import('./auth.js');
}

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('verifyToken', () => {
  beforeEach(() => {
    query.mockReset();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('uses the current database role instead of a stale token role', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user-1',
          employee_id: 'EMP005',
          role_id: 'employee-role',
          must_change_password: false,
        },
      ],
    });

    const token = jwt.sign(
      {
        user_id: 'user-1',
        employee_id: 'EMP005',
        role_id: 'old-hr-role',
        must_change_password: false,
      },
      process.env.JWT_SECRET
    );
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      path: '/employees',
      originalUrl: '/api/employees',
    };
    const res = mockResponse();
    const next = vi.fn();

    const { verifyToken } = await loadAuth();
    await verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({
      user_id: 'user-1',
      employee_id: 'EMP005',
      role_id: 'employee-role',
      must_change_password: false,
    });
  });
});
