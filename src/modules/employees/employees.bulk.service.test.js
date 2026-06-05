import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

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

vi.mock('../leave/leave.service.js', () => ({
  initializeBalances,
}));

function refs() {
  return {
    departments: new Map([['human resources', { id: 'dept-hr', department_name: 'Human Resources' }]]),
    designations: new Map([['hr executive', { id: 'des-hr-exec', title: 'HR Executive', department_id: 'dept-hr' }]]),
    employmentTypes: new Map([['full-time', { id: 'type-full', type_name: 'Full-Time' }]]),
    jobStatuses: new Map([['active', { id: 'status-active', status_name: 'Active' }]]),
    workModes: new Map([['on-site', { id: 'mode-onsite', mode_name: 'On-site' }]]),
    workLocations: new Map([['head office', { id: 'loc-head', location_name: 'Head Office' }]]),
    shifts: new Map([['morning', { id: 'shift-morning', name: 'Morning' }]]),
  };
}

function row(overrides = {}) {
  return {
    rowNumber: 2,
    data: {
      employee_id: 'EMP0001',
      full_name: 'Ali Khan',
      father_name: 'Ahmed Khan',
      cnic: '42101-1234567-1',
      date_of_birth: '1995-01-15',
      department: 'Human Resources',
      designation: 'HR Executive',
      employment_type: 'Full-Time',
      job_status: 'Active',
      work_mode: 'On-site',
      work_location: 'Head Office',
      shift: 'Morning',
      date_of_joining: '2026-01-01',
      primary_phone: '03000000000',
      permanent_country: 'Pakistan',
      permanent_province: 'Punjab',
      permanent_city: 'Lahore',
      postal_same_as_permanent: 'Yes',
      ...overrides,
    },
  };
}

describe('employee bulk service', () => {
  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    release.mockReset();
    initializeBalances.mockReset();
    initializeBalances.mockResolvedValue([]);
  });

  it('validates readable values and maps valid rows to UUID payloads', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { validateEmployeeRows } = await import('./employees.bulk.service.js');
    const preview = await validateEmployeeRows([row()], refs());

    expect(preview.valid_rows).toBe(1);
    expect(preview.rows[0].errors).toEqual([]);
    expect(preview.rows[0].mapped.jobInfo).toMatchObject({
      department_id: 'dept-hr',
      designation_id: 'des-hr-exec',
      employment_type_id: 'type-full',
      job_status_id: 'status-active',
    });
  });

  it('rejects short employee ids and unknown master data', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { validateEmployeeRows } = await import('./employees.bulk.service.js');
    const preview = await validateEmployeeRows([
      row({ employee_id: 'EMP001', department: 'Bad Department' }),
    ], refs());

    expect(preview.valid_rows).toBe(0);
    expect(preview.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'employee_id' }),
        expect.objectContaining({ field: 'department' }),
      ])
    );
  });

  it('builds a readable required-field template that still parses uploaded rows', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'dept-hr', department_name: 'Human Resources' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'des-hr-exec', title: 'HR Executive', department_id: 'dept-hr' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'type-full', type_name: 'Full-Time' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'status-active', status_name: 'Active' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'mode-onsite', mode_name: 'On-Site' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'loc-head', location_name: 'Head Office - Karachi' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'shift-morning', name: 'Morning Shift' }] });

    const { buildEmployeeBulkTemplate, parseEmployeeWorkbook } = await import('./employees.bulk.service.js');
    const buffer = await buildEmployeeBulkTemplate();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Employees');

    expect(sheet.getCell('A1').value).toBe('employee_id *');
    expect(sheet.getCell('A1').fill.fgColor.argb).toBe('FFFFE4E6');
    expect(sheet.getCell('N1').value).toBe('date_of_exit');
    expect(sheet.getCell('N1').fill.fgColor.argb).toBe('FFEFF6FF');
    expect(sheet.getCell('A2').dataValidation).toMatchObject({
      type: 'textLength',
      operator: 'equal',
      formulae: [7],
    });

    const rows = await parseEmployeeWorkbook(buffer);
    expect(rows[0].data).toMatchObject({
      employee_id: 'EMP0001',
      full_name: 'Ali Khan',
      department: 'Human Resources',
    });
  });

  it('imports each valid employee without creating users, salary, or allowances', async () => {
    clientQuery.mockResolvedValue({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'summary-log' }] });

    const { validateEmployeeRows, importBulkEmployees } = await import('./employees.bulk.service.js');
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const preview = await validateEmployeeRows([row()], refs());

    const result = await importBulkEmployees(preview.rows, 'user-id');

    expect(result.imported_count).toBe(1);
    const sql = clientQuery.mock.calls.map(([text]) => text).join('\n');
    expect(sql).toContain('INSERT INTO public.employee_info');
    expect(sql).toContain('INSERT INTO public.job_info');
    expect(sql).not.toContain('INSERT INTO public.users');
    expect(sql).not.toContain('employee_salary');
    expect(sql).not.toContain('employee_allowances');
    expect(initializeBalances).toHaveBeenCalledWith('EMP0001', 2026, { db: expect.any(Object) });
  });
});
