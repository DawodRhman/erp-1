import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

describe('dashboard service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('returns real KPI percentages with explicit periods', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ total: 102 }] })
      .mockResolvedValueOnce({ rows: [{ total: 6 }] })
      .mockResolvedValueOnce({ rows: [{ total: 36 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ month: 'May', present: 65, absent: 1, late: 4 }] })
      .mockResolvedValueOnce({ rows: [{ month: 'May', count: 102 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ attended: 90, on_time: 72, attendance_records: 100 }],
      })
      .mockResolvedValueOnce({
        rows: [{ used: '30', allocated: '120' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'activity-1',
          action: 'LEAVE_REQUEST_APPROVED',
          type: 'leave',
          entity_id: 'leave-1',
          created_at: '2026-06-09T08:00:00.000Z',
          actor_name: 'HR Manager',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          employee_id: 'EMP0020',
          name: 'Department Head',
          email: 'department.head@example.com',
          department_name: 'Engineering',
          work_location_name: 'Lahore Office',
        }],
      });

    const { getHRMetrics } = await import('./dashboard.service.js');
    const metrics = await getHRMetrics('6m');

    expect(metrics.attendance_rate_percent).toBe(90);
    expect(metrics.on_time_percent).toBe(80);
    expect(metrics.leave_utilization_percent).toBe(25);
    expect(metrics.kpi_periods).toEqual({
      attendance_rate: 'month_to_date',
      on_time_rate: 'month_to_date',
      leave_utilization: 'current_leave_year',
    });
    expect(metrics.recent_activity).toEqual([
      expect.objectContaining({
        text: 'leave request approved',
        by: 'HR Manager',
        type: 'leave',
      }),
    ]);
    expect(query.mock.calls[7][0]).toContain('next_birthday <= CURRENT_DATE + 30');
    expect(query.mock.calls[7][0]).not.toContain('GREATEST');
    expect(query.mock.calls[12][0]).toContain('FROM public.activity_logs al');
    expect(query.mock.calls[13][0]).toContain("r.role_name = 'department_head'");
    expect(metrics.department_heads).toEqual([
      expect.objectContaining({
        employee_id: 'EMP0020',
        name: 'Department Head',
        department_name: 'Engineering',
      }),
    ]);
  });
});
