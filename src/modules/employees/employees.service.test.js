import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const clientQuery = vi.hoisted(() => vi.fn());
const release = vi.hoisted(() => vi.fn());
const initializeBalances = vi.hoisted(() => vi.fn());
const recordActivityLog = vi.hoisted(() => vi.fn());

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

vi.mock('../audit/audit.service.js', () => ({
  recordActivityLog,
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
    employeeContact: {
      primary_phone: '03000000000',
      alternate_phone: '03111111111',
      same_as_permanent: false,
      permanent_address: {
        country: 'Pakistan',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        town: 'Gulberg',
        street: 'House 12, Main Boulevard',
        postal_code: '54000',
      },
      postal_address: {
        country: 'Pakistan',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        town: 'Model Town',
        street: 'Office 4',
        postal_code: '54700',
      },
    },
    emergencyContacts: {
      e_contact_1_relation: 'father',
      e_contact_1_full_name: 'Emergency Person',
      e_contact_1_phone: '03222222222',
      e_contact_1_phone_country_code: '+92',
      primary_contact: 1,
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

  it('stores employee contact in employee_contacts and keeps emergency_contacts emergency-only', async () => {
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

    const employeeContactCall = clientQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO public.employee_contacts')
    );
    const emergencyContactCall = clientQuery.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO public.emergency_contacts')
    );

    expect(employeeContactCall).toBeTruthy();
    expect(employeeContactCall[1]).toEqual(
      expect.arrayContaining(['EMP764', '03000000000', '03111111111', 'Pakistan', 'Punjab', 'Lahore'])
    );
    expect(emergencyContactCall[0]).not.toMatch(/\bcontact_1\b/);
    expect(emergencyContactCall[0]).not.toMatch(/\bcontact_2\b/);
    expect(emergencyContactCall[0]).not.toContain('perment_address');
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

  it('returns frontend-mappable duplicate employee id details', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [{ employee_id: 'EMP764' }] });

    const { createEmployee } = await loadService();

    await expect(createEmployee(employeePayload('EMP764'), 'creator-user-id')).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_EMPLOYEE_ID',
      details: [
        {
          field: 'employee_id',
          path: ['employee_id'],
          message: 'Employee ID already exists.',
        },
      ],
    });
  });

  it('returns frontend-mappable duplicate cnic details', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ cnic: '42101-9999999-1' }] });

    const { createEmployee } = await loadService();

    await expect(createEmployee(employeePayload('EMP764'), 'creator-user-id')).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_CNIC',
      details: [
        {
          field: 'cnic',
          path: ['personalInfo', 'cnic'],
          message: 'CNIC number already exists.',
        },
      ],
    });
  });

  it('returns frontend-mappable duplicate email details', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'frontend.employee@example.com' }] });

    const { createEmployee } = await loadService();

    await expect(createEmployee(employeePayload('EMP764'), 'creator-user-id')).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_EMAIL',
      details: [
        {
          field: 'email',
          path: ['accountInfo', 'email'],
          message: 'An account with this email already exists.',
        },
      ],
    });
  });
});

describe('employee profile photo fields', () => {
  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    release.mockReset();
    recordActivityLog.mockReset();
    recordActivityLog.mockResolvedValue(null);
  });

  it('selects the latest profile photo url in the employee list', async () => {
    query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

    const { getEmployees } = await loadService();
    await getEmployees({ page: 1, limit: 20 });

    expect(query.mock.calls[0][0]).toContain('profile_photo_url');
    expect(query.mock.calls[0][0]).toContain('public.employee_attachments');
    expect(query.mock.calls[0][0]).toContain("kind = 'profile_photo'");
  });

  it('selects the latest profile photo url in employee detail', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            employee_id: 'EMP0001',
            name: 'Super Admin',
            profile_photo_url: '/uploads/employees/EMP0001/profile/photo.png',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const { getEmployeeById } = await loadService();
    const employee = await getEmployeeById('EMP0001');

    expect(query.mock.calls[0][0]).toContain('profile_photo_url');
    expect(query.mock.calls[0][0]).toContain('public.employee_attachments');
    expect(employee.profile_photo_url).toBe('/uploads/employees/EMP0001/profile/photo.png');
  });
});

describe('createEmployeeAccount', () => {
  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    release.mockReset();
    recordActivityLog.mockReset();
    recordActivityLog.mockResolvedValue(null);
  });

  it('creates a login account for an existing employee without a user', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ employee_id: 'EMP0201', primary_phone: '03001234567' }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'role-1' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-1', email: 'emp0201@example.com', employee_id: 'EMP0201' }],
      });

    const { createEmployeeAccount } = await loadService();
    const result = await createEmployeeAccount('EMP0201', {
      email: 'emp0201@example.com',
      role_id: 'role-1',
    }, 'creator-user-id');

    expect(query.mock.calls[4][0]).toContain('INSERT INTO public.users');
    expect(query.mock.calls[4][1]).toEqual([
      'EMP0201',
      'emp0201@example.com',
      'hashed-password',
      'role-1',
    ]);
    expect(result.tempPassword).toBe('TempPass123!');
    expect(result.whatsappPhone).toBe('03001234567');
    expect(result.user.email).toBe('emp0201@example.com');
    expect(recordActivityLog).toHaveBeenCalledWith({
      userId: 'creator-user-id',
      action: 'EMPLOYEE_ACCOUNT_CREATED',
      entityType: 'employee',
      entityId: 'EMP0201',
      meta: {
        employee_id: 'EMP0201',
        account_user_id: 'user-1',
        email: 'emp0201@example.com',
        role_id: 'role-1',
      },
      requestContext: {},
      bestEffort: true,
    });
  });

  it('rejects account creation when the employee already has a user', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ employee_id: 'EMP0201' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-user' }] });

    const { createEmployeeAccount } = await loadService();

    await expect(createEmployeeAccount('EMP0201', {
      email: 'emp0201@example.com',
      role_id: 'role-1',
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'ACCOUNT_EXISTS',
    });
  });
});
