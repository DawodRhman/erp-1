import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const clientQuery = vi.hoisted(() => vi.fn());
const release = vi.hoisted(() => vi.fn());
const initializeBalances = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: {
    query,
    connect: vi.fn(() => Promise.resolve({ query: clientQuery, release })),
  },
}));

vi.mock('../auth/auth.service.js', () => ({
  generateTempPassword: () => 'TempPass123!',
  hashPassword: vi.fn(() => Promise.resolve('hashed-password')),
}));

vi.mock('../leave/leave.service.js', () => ({
  initializeBalances,
}));

async function loadService() {
  vi.resetModules();
  return import('./employees.service.js');
}

function employeePayload(employeeId = 'EMP764') {
  return {
    employee_id: employeeId,
    personalInfo: {
      name: 'Frontend Employee',
      father_name: 'Parent Name',
      cnic: '42101-9999999-1',
      date_of_birth: '1995-01-15',
    },
    jobInfo: {
      department_id: '11111111-1111-4111-8111-111111111111',
      designation_id: '22222222-2222-4222-8222-222222222222',
      employment_type_id: '33333333-3333-4333-8333-333333333333',
      job_status_id: '44444444-4444-4444-8444-444444444444',
      work_mode_id: '55555555-5555-4555-8555-555555555555',
      work_location_id: '66666666-6666-4666-8666-666666666666',
      shift_id: '77777777-7777-4777-8777-777777777777',
      date_of_joining: '2026-05-22',
    },
    accountInfo: {
      email: 'frontend.employee@example.com',
      phone: '03000000000',
      role_id: null,
    },
  };
}

describe('createEmployee', () => {
  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    release.mockReset();
    initializeBalances.mockReset();
    initializeBalances.mockResolvedValue([]);
  });

  it('uses the frontend-provided employee_id instead of generating the next id', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            employee_id: 'EMP764',
            name: 'Frontend Employee',
            father_name: 'Parent Name',
            cnic: '42101-9999999-1',
            date_of_birth: '1995-01-15',
          },
        ],
      })
      .mockResolvedValue({});

    const { createEmployee } = await loadService();
    const result = await createEmployee(employeePayload('EMP764'), 'creator-user-id');

    const employeeInsertCall = clientQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO public.employee_info')
    );

    expect(employeeInsertCall[1][0]).toBe('EMP764');
    expect(result.employee.employee_id).toBe('EMP764');
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('MAX(employee_id)'))).toBe(false);
  });

  it('initializes joining-year leave balances inside employee creation', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ employee_id: 'EMP764', name: 'Frontend Employee' }],
      })
      .mockResolvedValue({});

    const { createEmployee } = await loadService();
    await createEmployee(employeePayload('EMP764'), 'creator-user-id');

    expect(initializeBalances).toHaveBeenCalledWith('EMP764', 2026, { db: expect.any(Object) });
  });

  it('initializes current-year balances when an existing employee is entered with a historical joining date', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ employee_id: 'EMP474', name: 'Existing Employee' }],
      })
      .mockResolvedValue({});

    const payload = employeePayload('EMP474');
    payload.jobInfo.date_of_joining = '1985-09-16';

    const { createEmployee } = await loadService();
    await createEmployee(payload, 'creator-user-id');

    expect(initializeBalances).toHaveBeenCalledWith(
      'EMP474',
      new Date().getUTCFullYear(),
      { db: expect.any(Object) }
    );
  });
});
