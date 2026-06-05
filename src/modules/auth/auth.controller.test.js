import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginUser = vi.hoisted(() => vi.fn());
const recordActivityLog = vi.hoisted(() => vi.fn());

vi.mock('./auth.service.js', () => ({
  login: loginUser,
  changePassword: vi.fn(),
  getRolePermissions: vi.fn(),
}));

vi.mock('../audit/audit.service.js', () => ({
  buildAuditRequestContext: vi.fn((req, extra = {}) => ({
    ip_address: req.ip,
    user_agent: req.headers?.['user-agent'],
    method: req.method,
    path: req.originalUrl,
    actor_user_id: req.user?.user_id,
    actor_employee_id: req.user?.employee_id,
    actor_role_id: req.user?.role_id,
    ...extra,
  })),
  recordActivityLog,
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
    recordActivityLog.mockReset();
    recordActivityLog.mockResolvedValue(null);
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

  it('records login audit context after successful login', async () => {
    mockLoginUser();
    const req = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '127.0.0.1',
      body: { email: 'superadmin@esspl.com.pk', password: 'password123' },
      secure: false,
      headers: { 'user-agent': 'Vitest Browser' },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    const { login } = await import('./auth.controller.js');
    await login(req, res, next);

    expect(recordActivityLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'auth',
      entityId: 'employee-1',
      meta: {
        employee_id: 'employee-1',
        email: 'superadmin@esspl.com.pk',
        role_id: 'role-1',
      },
      requestContext: {
        ip_address: '127.0.0.1',
        user_agent: 'Vitest Browser',
        method: 'POST',
        path: '/api/auth/login',
        actor_user_id: 'user-1',
        actor_employee_id: 'employee-1',
        actor_role_id: 'role-1',
        actor_email: 'superadmin@esspl.com.pk',
      },
      bestEffort: true,
    });
  });

  it('records failed login audit context without password data', async () => {
    const error = new Error('Invalid email or password.');
    error.code = 'INVALID_CREDENTIALS';
    loginUser.mockRejectedValueOnce(error);
    const req = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '127.0.0.1',
      body: { email: 'bad@example.com', password: 'wrong-password' },
      secure: false,
      headers: { 'user-agent': 'Vitest Browser' },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    };
    const res = mockResponse();
    const next = vi.fn();

    const { login } = await import('./auth.controller.js');
    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(recordActivityLog).toHaveBeenCalledWith({
      userId: null,
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'auth',
      meta: {
        email: 'bad@example.com',
        error_code: 'INVALID_CREDENTIALS',
      },
      requestContext: {
        ip_address: '127.0.0.1',
        user_agent: 'Vitest Browser',
        method: 'POST',
        path: '/api/auth/login',
        actor_user_id: undefined,
        actor_employee_id: undefined,
        actor_role_id: undefined,
        actor_email: 'bad@example.com',
      },
      bestEffort: true,
    });
    expect(JSON.stringify(recordActivityLog.mock.calls[0][0])).not.toContain('wrong-password');
  });
});
