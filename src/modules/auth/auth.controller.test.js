import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginUser = vi.hoisted(() => vi.fn());

vi.mock('./auth.service.js', () => ({
  login: loginUser,
  changePassword: vi.fn(),
  getRolePermissions: vi.fn(),
}));

function mockResponse() {
  const res = {
    cookie: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function mockLoginUser() {
  loginUser.mockResolvedValue({
    user_id: 'user-1',
    employee_id: 'employee-1',
    role_id: 'role-1',
    must_change_password: false,
    email: 'superadmin@esspl.com.pk',
    id: 'user-1',
  });
}

describe('auth controller cookies', () => {
  beforeEach(() => {
    vi.resetModules();
    loginUser.mockReset();
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.NODE_ENV;
  });

  it('uses SameSite=None and Secure for HTTPS tunnel requests', async () => {
    mockLoginUser();
    const req = {
      body: { email: 'superadmin@esspl.com.pk', password: 'password123' },
      secure: false,
      headers: { 'x-forwarded-proto': 'https' },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    const { login } = await import('./auth.controller.js');
    await login(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'ems_jwt',
      expect.any(String),
      expect.objectContaining({
        sameSite: 'none',
        secure: true,
      })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'ems_csrf',
      expect.any(String),
      expect.objectContaining({
        sameSite: 'none',
        secure: true,
      })
    );
  });

  it('keeps localhost HTTP cookies non-secure and SameSite=Lax', async () => {
    mockLoginUser();
    const req = {
      body: { email: 'superadmin@esspl.com.pk', password: 'password123' },
      secure: false,
      headers: {},
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    const { login } = await import('./auth.controller.js');
    await login(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'ems_jwt',
      expect.any(String),
      expect.objectContaining({
        sameSite: 'lax',
        secure: false,
      })
    );
  });
});
