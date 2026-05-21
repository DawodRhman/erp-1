import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

describe('config service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('reads roles as a config entity without requiring an is_active column', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'role-id',
          department_id: null,
          role_name: 'employee',
          description: 'Employee',
        },
      ],
    });

    const { getEntityRecords } = await import('./config.service.js');
    const records = await getEntityRecords('roles', { isSuperAdminCaller: false });

    expect(records).toEqual([
      {
        id: 'role-id',
        department_id: null,
        role_name: 'employee',
        description: 'Employee',
      },
    ]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FROM public.roles');
    expect(query.mock.calls[0][0]).not.toContain('is_active');
  });
});
