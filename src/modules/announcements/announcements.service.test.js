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
    expect(query.mock.calls[0][0]).toContain('a.expiry_date IS NULL OR a.expiry_date >= CURRENT_DATE');
  });

  it('creates announcements with author metadata and expiry_date', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'announcement-id',
        title: 'Office timing',
        body: 'Friday timing update',
        expiry_date: '2026-07-01',
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
      expiry_date: '2026-07-01',
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
      '2026-07-01',
      ['department-id'],
      ['designation-id'],
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
      null,
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
    expect(query.mock.calls[0][0]).toContain('announcement_read_receipts receipt');
    expect(query.mock.calls[0][0]).toContain('receipt.read_at');
    expect(query.mock.calls[0][1]).toEqual(['EMP061']);
  });

  it('forces Department Head announcement targets to assigned department scope', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'announcement-id', target_department_ids: ['dept-engineering'] }],
    });

    const { createAnnouncement } = await import('./announcements.service.js');
    await createAnnouncement({
      title: 'Scoped notice',
      body: 'Visible only to my department',
      target_department_ids: ['dept-sales'],
      userId: 'user-head',
      scope: { department_id: 'dept-engineering' },
    });

    expect(query.mock.calls[0][1][3]).toEqual(['dept-engineering']);
  });

  it('marks an announcement read once per employee and user', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'announcement-id' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'receipt-id',
          announcement_id: 'announcement-id',
          user_id: 'user-id',
          employee_id: 'EMP061',
          read_at: '2026-06-16T07:00:00.000Z',
        }],
      });

    const { markAnnouncementRead } = await import('./announcements.service.js');
    const receipt = await markAnnouncementRead('announcement-id', {
      userId: 'user-id',
      employeeId: 'EMP061',
    });

    expect(receipt).toMatchObject({ id: 'receipt-id', announcement_id: 'announcement-id' });
    expect(query.mock.calls[0][0]).toContain('FROM public.announcements');
    expect(query.mock.calls[1][0]).toContain('INSERT INTO public.announcement_read_receipts');
    expect(query.mock.calls[1][0]).toContain('ON CONFLICT (announcement_id, employee_id)');
    expect(query.mock.calls[1][1]).toEqual(['announcement-id', 'user-id', 'EMP061']);
  });
});
