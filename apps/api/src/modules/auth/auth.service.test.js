import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const compare = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed')),
    compare,
  },
}));

async function loadService() {
  vi.resetModules();
  return import('./auth.service.js');
}

describe('auth service', () => {
  beforeEach(() => {
    query.mockReset();
    compare.mockReset();
  });

  it('rejects inactive user accounts during login', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          email: 'inactive@example.com',
          employee_id: 'EMP0001',
          role_id: 'role-1',
          password: 'hash',
          must_change_password: false,
          is_active: false,
          job_status_name: 'Active',
        },
      ],
    });

    const { login } = await loadService();

    await expect(login('inactive@example.com', 'Password123!')).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED',
      statusCode: 403,
      message: 'Your account is disabled. Contact your HR.',
    });
    expect(compare).not.toHaveBeenCalled();
  });

  it('rejects terminated employee accounts even when the user account is active', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-2',
          email: 'terminated@example.com',
          employee_id: 'EMP0099',
          role_id: 'role-employee',
          password: 'hash',
          must_change_password: false,
          is_active: true,
          job_status_name: 'Terminated',
        },
      ],
    });

    const { login } = await loadService();

    await expect(login('terminated@example.com', 'Password123!')).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED',
      statusCode: 403,
      message: 'Your account is disabled. Contact your HR.',
    });
    expect(compare).not.toHaveBeenCalled();
  });
});
