import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
}));

describe('calendar events service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('filters employee calendar events by selected department and designation targets', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event-id', title: 'Support training' }] });

    const { getCalendarEvents } = await import('./calendar-events.service.js');
    const events = await getCalendarEvents({ roleId: 'employee-role', employeeId: 'EMP061' });

    expect(events).toEqual([{ id: 'event-id', title: 'Support training' }]);
    expect(query.mock.calls[1][0]).toContain('LEFT JOIN public.job_info viewer_job');
    expect(query.mock.calls[1][0]).toContain('cardinality(ce.target_department_ids)');
    expect(query.mock.calls[1][0]).toContain('viewer_job.department_id = ANY(ce.target_department_ids)');
    expect(query.mock.calls[1][0]).toContain('viewer_job.designation_id = ANY(ce.target_designation_ids)');
    expect(query.mock.calls[1][1]).toEqual(['EMP061']);
  });

  it('creates calendar events with multiple department and designation targets', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'event-id',
        title: 'Team briefing',
        target_department_ids: ['department-a'],
        target_designation_ids: ['designation-a', 'designation-b'],
      }],
    });

    const { createCalendarEvent } = await import('./calendar-events.service.js');
    const event = await createCalendarEvent({
      title: 'Team briefing',
      start_date: '2026-06-15',
      end_date: '2026-06-18',
      type: 'meeting',
      visibility: 'employee',
      target_department_ids: ['department-a'],
      target_designation_ids: ['designation-a', 'designation-b'],
    }, 'user-id');

    expect(event).toMatchObject({ id: 'event-id', title: 'Team briefing' });
    expect(query.mock.calls[0][0]).toContain('target_department_ids');
    expect(query.mock.calls[0][0]).toContain('target_designation_ids');
    expect(query.mock.calls[0][1]).toEqual([
      'meeting',
      '2026-06-15',
      '2026-06-18',
      'Team briefing',
      'employee',
      ['department-a'],
      ['designation-a', 'designation-b'],
      'user-id',
    ]);
  });

  it('lists calendar events whose date ranges overlap the requested range', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'hr_manager' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event-id', title: 'Quarter training' }] });

    const { getCalendarEvents } = await import('./calendar-events.service.js');
    await getCalendarEvents({
      from: '2026-06-01',
      to: '2026-06-30',
      roleId: 'hr-role',
      sort: 'date',
      order: 'asc',
    });

    expect(query.mock.calls[1][0]).toContain('ce.start_date <= $');
    expect(query.mock.calls[1][0]).toContain('ce.end_date >= $');
    expect(query.mock.calls[1][0]).not.toContain('ce.date >=');
    expect(query.mock.calls[1][1]).toEqual(['2026-06-30', '2026-06-01']);
  });
});
