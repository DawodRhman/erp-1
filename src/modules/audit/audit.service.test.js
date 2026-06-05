import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

describe('audit service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('writes activity log entries without secrets in SQL params', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'log-id' }] });

    const { recordActivityLog } = await import('./audit.service.js');
    const result = await recordActivityLog({
      userId: 'user-id',
      action: 'BULK_EMPLOYEE_VALIDATE',
      entityType: 'employees',
      entityId: 'EMP0001',
      meta: { total_rows: 1 },
    });

    expect(result).toEqual({ id: 'log-id' });
    expect(query.mock.calls[0][0]).toContain('INSERT INTO public.activity_logs');
    expect(query.mock.calls[0][1]).toEqual([
      'user-id',
      'BULK_EMPLOYEE_VALIDATE',
      'employees',
      'EMP0001',
      JSON.stringify({ total_rows: 1 }),
    ]);
  });

  it('merges request identity context into audit metadata', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'log-id' }] });

    const { buildAuditRequestContext, recordActivityLog } = await import('./audit.service.js');
    const requestContext = buildAuditRequestContext({
      ip: '10.0.0.10',
      method: 'POST',
      originalUrl: '/api/employees/EMP0001/account',
      headers: {
        'user-agent': 'Vitest Browser',
        'x-request-id': 'request-1',
      },
      user: {
        user_id: 'actor-user',
        employee_id: 'EMP0002',
        role_id: 'role-hr',
      },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    }, { actor_email: 'hr@example.com' });

    await recordActivityLog({
      userId: 'actor-user',
      action: 'EMPLOYEE_ACCOUNT_CREATED',
      entityType: 'employee',
      entityId: 'EMP0001',
      meta: { employee_id: 'EMP0001' },
      requestContext,
    });

    expect(query.mock.calls[0][1][4]).toBe(JSON.stringify({
      employee_id: 'EMP0001',
      ip_address: '10.0.0.10',
      user_agent: 'Vitest Browser',
      method: 'POST',
      path: '/api/employees/EMP0001/account',
      request_id: 'request-1',
      actor_user_id: 'actor-user',
      actor_employee_id: 'EMP0002',
      actor_role_id: 'role-hr',
      actor_email: 'hr@example.com',
    }));
  });

  it('lists activity logs with identity fields flattened for the UI', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'log-1',
          user_id: 'actor-user',
          action: 'AUTH_LOGIN_SUCCESS',
          entity_type: 'auth',
          entity_id: 'EMP0001',
          created_at: '2026-06-05T11:00:00.000Z',
          actor_email: 'admin@example.com',
          actor_employee_id: 'EMP0001',
          actor_role_name: 'super_admin',
          actor_name: 'Super Admin',
          total_count: 1,
          meta: {
            ip_address: '10.0.0.10',
            user_agent: 'Vitest Browser',
            method: 'POST',
            path: '/api/auth/login',
            actor_user_id: 'actor-user',
            actor_employee_id: 'EMP0001',
            actor_role_id: 'role-super',
            actor_email: 'admin@example.com',
          },
        },
      ],
    });

    const { listActivityLogs } = await import('./audit.service.js');
    const result = await listActivityLogs({ module: 'auth', search: 'login' });

    expect(query.mock.calls[0][0]).toContain('FROM public.activity_logs al');
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'log-1',
      user: 'Super Admin',
      role: 'super_admin',
      action: 'AUTH_LOGIN_SUCCESS',
      module: 'auth',
      recordId: 'EMP0001',
      ip_address: '10.0.0.10',
      user_agent: 'Vitest Browser',
      method: 'POST',
      path: '/api/auth/login',
      actor_user_id: 'actor-user',
      actor_employee_id: 'EMP0001',
      actor_role_id: 'role-super',
      actor_email: 'admin@example.com',
    });
  });
});
