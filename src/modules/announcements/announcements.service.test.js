import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

describe('announcements service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('hides inactive announcements for regular list calls', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'announcement-id', title: 'Office timing', is_active: true }],
    });

    const { listAnnouncements } = await import('./announcements.service.js');
    const records = await listAnnouncements({ activeOnly: true, roleName: 'employee' });

    expect(records).toEqual([{ id: 'announcement-id', title: 'Office timing', is_active: true }]);
    expect(query.mock.calls[0][0]).toContain('a.is_active = true');
  });

  it('creates announcements with audience and author metadata', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'announcement-id',
        title: 'Office timing',
        body: 'Friday timing update',
        audience: 'all',
        created_by: 'user-id',
        is_active: true,
      }],
    });

    const { createAnnouncement } = await import('./announcements.service.js');
    const created = await createAnnouncement({
      title: 'Office timing',
      body: 'Friday timing update',
      audience: 'all',
      is_active: true,
      userId: 'user-id',
    });

    expect(created).toMatchObject({ id: 'announcement-id', title: 'Office timing' });
    expect(query.mock.calls[0][0]).toContain('INSERT INTO public.announcements');
    expect(query.mock.calls[0][1]).toEqual([
      'Office timing',
      'Friday timing update',
      'all',
      true,
      'user-id',
    ]);
  });
});
