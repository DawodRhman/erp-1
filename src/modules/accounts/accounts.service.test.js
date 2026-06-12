import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

async function loadService() {
  vi.resetModules();
  return import('./accounts.service.js');
}

describe('accounts service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('lists user accounts from real backend users and roles', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          employee_id: null,
          email: 'superadmin@esspl.com.pk',
          role_id: 'role-1',
          role_name: 'super_admin',
          role_description: 'Super Admin',
          is_active: true,
          must_change_password: false,
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-01T00:00:00.000Z',
          employee_name: null,
        },
      ],
    });

    const { listAccounts } = await loadService();
    const accounts = await listAccounts();

    expect(accounts).toEqual([
      expect.objectContaining({
        id: 'user-1',
        employee_id: null,
        email: 'superadmin@esspl.com.pk',
        role_name: 'super_admin',
        employee_name: null,
        is_active: true,
        status: 'Active',
        linked_employee: 'Account only',
      }),
    ]);
    expect(query.mock.calls[0][0]).toContain('FROM public.users u');
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN public.employee_info');
  });

  it('blocks deactivating the protected super admin account', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-1', role_name: 'super_admin', is_active: true }],
    });

    const { updateAccountStatus } = await loadService();

    await expect(updateAccountStatus('user-1', false)).rejects.toMatchObject({
      code: 'PROTECTED_ACCOUNT',
      statusCode: 403,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('updates non-super-admin active status', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-2', role_name: 'hr_manager', is_active: true }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'user-2', email: 'hr@example.com', is_active: false }],
      });

    const { updateAccountStatus } = await loadService();
    const account = await updateAccountStatus('user-2', false);

    expect(account).toEqual({ id: 'user-2', email: 'hr@example.com', is_active: false });
    expect(query.mock.calls[1][0]).toContain('UPDATE public.users');
    expect(query.mock.calls[1][1]).toEqual([false, 'user-2']);
  });

  it('requires credential template to include email and password placeholders', async () => {
    const { updateCredentialTemplate } = await loadService();

    await expect(updateCredentialTemplate('Hello {employeeName}')).rejects.toMatchObject({
      code: 'INVALID_TEMPLATE',
    });
  });
});
