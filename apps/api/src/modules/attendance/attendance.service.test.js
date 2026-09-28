import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const clientQuery = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn(() => ({
  query: clientQuery,
  release: vi.fn(),
})));

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
  pool: { query, connect },
}));

async function loadService() {
  vi.resetModules();
  return import('./attendance.service.js');
}

describe('attendance self-service', () => {
  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    connect.mockClear();
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

  it('lets an employee submit a pending attendance correction request for their own row', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'att-1', employee_id: 'EMP0007', date: '2026-06-16' }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'acr-1',
          attendance_id: 'att-1',
          employee_id: 'EMP0007',
          status: 'submitted',
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const { submitAttendanceCorrectionRequest } = await loadService();
    const result = await submitAttendanceCorrectionRequest(
      {
        date: '2026-06-16',
        requested_check_in: '09:05',
        requested_check_out: '18:01',
        reason: 'HR entered the wrong check-in time.',
      },
      'EMP0007',
      'user-employee'
    );

    expect(result).toMatchObject({
      id: 'acr-1',
      attendance_id: 'att-1',
      employee_id: 'EMP0007',
      status: 'submitted',
    });
    expect(query.mock.calls[0][0]).toContain('FROM public.attendance');
    expect(query.mock.calls[0][1]).toEqual(['EMP0007', '2026-06-16']);
    expect(query.mock.calls[1][0]).toContain('status = \'submitted\'');
    expect(query.mock.calls[2][0]).toContain('INSERT INTO public.attendance_correction_requests');
    expect(query.mock.calls[3][0]).toContain('INSERT INTO public.notifications');
  });

  it('rejects duplicate pending correction requests for the same attendance row', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'att-1', employee_id: 'EMP0007', date: '2026-06-16' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'acr-open' }] });

    const { submitAttendanceCorrectionRequest } = await loadService();

    await expect(submitAttendanceCorrectionRequest(
      {
        date: '2026-06-16',
        requested_check_in: '09:05',
        reason: 'Duplicate request.',
      },
      'EMP0007',
      'user-employee'
    )).rejects.toMatchObject({
      statusCode: 409,
      code: 'ATTENDANCE_CORRECTION_PENDING',
    });
  });

  it('approves a correction request and applies requested times to the attendance row atomically', async () => {
    clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'acr-1',
          attendance_id: 'att-1',
          employee_id: 'EMP0007',
          requested_check_in: '09:05:00',
          requested_check_out: '18:01:00',
          status: 'submitted',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'att-1', employee_id: 'EMP0007', check_in: '09:05:00' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'acr-1', status: 'approved', reviewed_by: 'hr-user' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({});

    const { reviewAttendanceCorrectionRequest } = await loadService();
    const result = await reviewAttendanceCorrectionRequest(
      'acr-1',
      { decision: 'approved', review_note: 'Approved after verification.' },
      'hr-user'
    );

    expect(result).toMatchObject({ id: 'acr-1', status: 'approved' });
    expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
    expect(clientQuery.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(clientQuery.mock.calls[2][0]).toContain('UPDATE public.attendance');
    expect(clientQuery.mock.calls[3][0]).toContain('UPDATE public.attendance_correction_requests');
    expect(clientQuery.mock.calls[4][0]).toContain('INSERT INTO public.notifications');
    expect(clientQuery.mock.calls.at(-1)[0]).toBe('COMMIT');
  });
});
