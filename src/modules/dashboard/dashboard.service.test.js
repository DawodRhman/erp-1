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
  });
});
