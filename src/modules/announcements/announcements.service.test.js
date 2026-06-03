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
        target_department_id: 'department-id',
        target_designation_id: 'designation-id',
        created_by: 'user-id',
        is_active: true,
      }],
    });

    const { createAnnouncement } = await import('./announcements.service.js');
    const created = await createAnnouncement({
      title: 'Office timing',
      body: 'Friday timing update',
      audience: 'all',
      target_department_id: 'department-id',
      target_designation_id: 'designation-id',
      is_active: true,
      userId: 'user-id',
    });

    expect(created).toMatchObject({ id: 'announcement-id', title: 'Office timing' });
    expect(query.mock.calls[0][0]).toContain('INSERT INTO public.announcements');
    expect(query.mock.calls[0][1]).toEqual([
      'Office timing',
      'Friday timing update',
      'all',
      'department-id',
      'designation-id',
      true,
      'user-id',
    ]);
  });

  it('creates announcements with multiple department and designation targets', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'announcement-id',
        title: 'Department notice',
        target_department_ids: ['department-a', 'department-b'],
        target_designation_ids: ['designation-a'],
      }],
    });

    const { createAnnouncement } = await import('./announcements.service.js');
    const created = await createAnnouncement({
      title: 'Department notice',
      body: 'Visible to selected teams',
      audience: 'employee',
      target_department_ids: ['department-a', 'department-b'],
      target_designation_ids: ['designation-a'],
      is_active: true,
      userId: 'user-id',
    });

    expect(created).toMatchObject({ id: 'announcement-id', title: 'Department notice' });
    expect(query.mock.calls[0][0]).toContain('target_department_ids');
    expect(query.mock.calls[0][0]).toContain('target_designation_ids');
    expect(query.mock.calls[0][1]).toEqual([
      'Department notice',
      'Visible to selected teams',
      'employee',
      ['department-a', 'department-b'],
      ['designation-a'],
      true,
      'user-id',
    ]);
  });

  it('filters employee announcements by department and designation targets', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'announcement-id', title: 'Support notice', is_active: true }],
    });

    const { listAnnouncements } = await import('./announcements.service.js');
    await listAnnouncements({
      activeOnly: true,
      roleName: 'employee',
      employeeId: 'EMP061',
    });

    expect(query.mock.calls[0][0]).toContain('LEFT JOIN public.job_info viewer_job');
    expect(query.mock.calls[0][0]).toContain('cardinality(a.target_department_ids)');
    expect(query.mock.calls[0][0]).toContain('viewer_job.department_id = ANY(a.target_department_ids)');
    expect(query.mock.calls[0][0]).toContain('viewer_job.department_id');
    expect(query.mock.calls[0][1]).toEqual(['EMP061']);
  });
});
