import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

async function loadService() {
  vi.resetModules();
  return import('./attendance.service.js');
}

describe('attendance self-service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns only the caller attendance for employee role without enforcing requested location', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: 'EMP521',
            name: 'Self User',
            designation: 'Engineer',
            work_location_id: 'actual-location',
            shift_id: 'shift-1',
            shift_name: 'Morning',
            start_time: '09:00:00',
            end_time: '18:00:00',
            late_after_minutes: 10,
            attendance_id: 'attendance-1',
            date: '2026-05-22',
            check_in: '09:12:00',
            check_out: null,
            status: 'late',
            notes: null,
            ack: false,
            state: 'saved',
            leave_id: null,
          },
        ],
      });

    const { getAttendanceSheet } = await loadService();
    const result = await getAttendanceSheet(
      '2026-05-22',
      'wrong-location',
      'EMP521',
      'employee-role'
    );

    expect(result.location_id).toBe('actual-location');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      employee_id: 'EMP521',
      status: 'late',
      late_by_minutes: 2,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toEqual(['2026-05-22', 'EMP521']);
  });

  it('forces monthly reports to the caller employee for employee role', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 26 }] });

    const { getMonthlyReport } = await loadService();
    await getMonthlyReport(
      2026,
      5,
      null,
      { employee_id: 'EMP002' },
      'EMP521',
      'employee-role'
    );

    expect(query.mock.calls[1][1]).toEqual([2026, 5, 'EMP521']);
    expect(query.mock.calls[1][0]).toContain('ei.employee_id = $3');
  });

  it('defaults attendance sheet date when no date is supplied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-22T08:00:00.000Z'));

    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'employee' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: 'EMP521',
            name: 'Self User',
            designation: 'Engineer',
            work_location_id: 'actual-location',
            shift_id: 'shift-1',
            shift_name: 'Morning',
            start_time: '09:00:00',
            end_time: '18:00:00',
            late_after_minutes: 10,
            attendance_id: null,
            date: null,
            check_in: null,
            check_out: null,
            status: null,
            notes: null,
            ack: null,
            state: null,
            leave_id: null,
          },
        ],
      });

    const { getAttendanceSheet } = await loadService();
    const result = await getAttendanceSheet(undefined, undefined, 'EMP521', 'employee-role');

    expect(result.date).toBe('2026-05-22');
    expect(result.rows[0].date).toBe('2026-05-22');
    expect(query.mock.calls[1][1]).toEqual(['2026-05-22', 'EMP521']);
  });

  it('filters Department Head attendance by assigned department and location', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ role_name: 'department_head' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { getAttendanceSheet } = await loadService();
    await getAttendanceSheet(
      '2026-06-09',
      'location-lahore',
      'EMP0020',
      'role-head',
      {
        department_id: 'dept-engineering',
        work_location_id: 'location-lahore',
      }
    );

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('ji.department_id = $3');
    expect(query.mock.calls[1][1]).toEqual([
      '2026-06-09',
      'location-lahore',
      'dept-engineering',
    ]);
  });

  it('rejects a Department Head request for another work location', async () => {
    query.mockResolvedValueOnce({ rows: [{ role_name: 'department_head' }] });

    const { getAttendanceSheet } = await loadService();

    await expect(getAttendanceSheet(
      '2026-06-09',
      'location-karachi',
      'EMP0020',
      'role-head',
      {
        department_id: 'dept-engineering',
        work_location_id: 'location-lahore',
      }
    )).rejects.toMatchObject({
      statusCode: 403,
      code: 'OUTSIDE_DEPARTMENT_SCOPE',
    });
  });
});
