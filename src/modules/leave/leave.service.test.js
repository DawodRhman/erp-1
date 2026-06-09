import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

async function loadService() {
  vi.resetModules();
  return import('./leave.service.js');
}

describe('leave balance entitlement initialization', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('prorates joining-year entitlement by remaining calendar days and rounds to whole days', async () => {
    const { calculateProratedBalance } = await loadService();

    expect(calculateProratedBalance(12, '2026-09-15', 2026)).toBe(4);
    expect(calculateProratedBalance(12, '2026-01-01', 2026)).toBe(12);
    expect(calculateProratedBalance(12, '2025-09-15', 2026)).toBe(12);
  });

  it('initializes balances from department-overridden and company-wide policies', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          employee_id: 'EMP001',
          department_id: 'department-id',
          date_of_joining: '2026-09-15',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { leave_type_id: 'annual-id', days_allowed: 12, department_id: 'department-id' },
          { leave_type_id: 'sick-id', days_allowed: 10, department_id: null },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ leave_type_id: 'annual-id', balance: 4 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ leave_type_id: 'sick-id', balance: 3 }] });

    const { initializeBalances } = await loadService();
    const created = await initializeBalances('EMP001', 2026);

    expect(created).toHaveLength(2);
    expect(query.mock.calls[1][0]).toContain('department_id IS NULL');
    expect(query.mock.calls[1][0]).toContain('department_id = $1');
    expect(query.mock.calls[1][0]).toContain('DISTINCT ON (leave_type_id)');
    expect(query.mock.calls[2][1]).toEqual(['EMP001', 'annual-id', 2026, 4]);
    expect(query.mock.calls[3][1]).toEqual(['EMP001', 'sick-id', 2026, 3]);
  });

  it('initializes a new leave year idempotently for eligible employees', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          { employee_id: 'EMP001' },
          { employee_id: 'EMP002' },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ employee_id: 'EMP001', department_id: 'dept-id', date_of_joining: '2025-03-01' }],
      })
      .mockResolvedValueOnce({ rows: [{ leave_type_id: 'annual-id', days_allowed: 12, department_id: null }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'balance-1' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ employee_id: 'EMP002', department_id: 'dept-id', date_of_joining: '2026-09-15' }],
      })
      .mockResolvedValueOnce({ rows: [{ leave_type_id: 'annual-id', days_allowed: 12, department_id: null }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'balance-2' }] });

    const { initializeYearlyBalances } = await loadService();
    const result = await initializeYearlyBalances(2026);

    expect(result).toEqual({ year: 2026, employees_processed: 2, balances_created: 2 });
    expect(query.mock.calls[3][1]).toEqual(['EMP001', 'annual-id', 2026, 12]);
    expect(query.mock.calls[6][1]).toEqual(['EMP002', 'annual-id', 2026, 4]);
    expect(query.mock.calls[3][0]).toContain('ON CONFLICT (employee_id, leave_type_id, year)');
  });

  it('does not allow employees to spend balances from a past leave year', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ employee_id: 'EMP001', department_id: 'dept-id', date_of_joining: '2024-01-01' }],
    });

    const { submitLeaveRequest } = await loadService();

    await expect(
      submitLeaveRequest('EMP001', {
        leave_type_id: 'annual-id',
        start_date: '2025-12-30',
        end_date: '2025-12-31',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EXPIRED_LEAVE_YEAR',
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('selects a readable reviewer label when the reviewer has no employee profile', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const { getLeaveRequests } = await loadService();
    await getLeaveRequests();

    expect(query.mock.calls[0][0]).toContain('COALESCE(reviewer_emp.name');
    expect(query.mock.calls[0][0]).toContain('reviewer_user.email');
    expect(query.mock.calls[0][0]).not.toContain('reviewer_emp.name AS reviewed_by_name');
  });

  it('aggregates leave balances into one summary row per employee', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 'EMP001',
          name: 'Adeel Rahman',
          department_name: 'Administration',
          profile_photo_url: '/uploads/employees/EMP001/profile/photo.png',
          leave_type_id: 'annual-id',
          leave_type_name: 'Annual Leave',
          balance: '12',
          used: '4',
          remaining: '8',
          year: 2026,
        },
        {
          employee_id: 'EMP001',
          name: 'Adeel Rahman',
          department_name: 'Administration',
          profile_photo_url: '/uploads/employees/EMP001/profile/photo.png',
          leave_type_id: 'sick-id',
          leave_type_name: 'Sick Leave',
          balance: '10',
          used: '2',
          remaining: '8',
          year: 2026,
        },
      ],
    });

    const { getLeaveBalanceSummary } = await loadService();
    const result = await getLeaveBalanceSummary({ year: 2026 });

    expect(result).toEqual([
      expect.objectContaining({
        employee_id: 'EMP001',
        employee_name: 'Adeel Rahman',
        total_allocated: 22,
        total_used: 6,
        total_remaining: 16,
        leave_types: [
          expect.objectContaining({ leave_type_name: 'Annual Leave', remaining: 8 }),
          expect.objectContaining({ leave_type_name: 'Sick Leave', remaining: 8 }),
        ],
      }),
    ]);
    expect(query.mock.calls[0][0]).toContain('profile_photo_url');
  });
});
