import ExcelJS from 'exceljs';
import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { initializeBalances } from '../leave/leave.service.js';
import { recordActivityLog } from '../audit/audit.service.js';

export const EMPLOYEE_SHEET = 'Employees';

const columns = [
  'employee_id',
  'full_name',
  'father_name',
  'cnic',
  'date_of_birth',
  'department',
  'designation',
  'employment_type',
  'job_status',
  'work_mode',
  'work_location',
  'shift',
  'date_of_joining',
  'date_of_exit',
  'probation_end_date',
  'contract_end_date',
  'primary_phone',
  'alternate_phone',
  'permanent_country',
  'permanent_province',
  'permanent_district',
  'permanent_city',
  'permanent_town',
  'permanent_street',
  'permanent_postal_code',
  'postal_same_as_permanent',
  'postal_country',
  'postal_province',
  'postal_district',
  'postal_city',
  'postal_town',
  'postal_street',
  'postal_postal_code',
  'emergency_contact_1_relation',
  'emergency_contact_1_full_name',
  'emergency_contact_1_phone',
  'emergency_contact_1_phone_country_code',
  'emergency_contact_1_email',
  'emergency_contact_2_relation',
  'emergency_contact_2_full_name',
  'emergency_contact_2_phone',
  'emergency_contact_2_phone_country_code',
  'emergency_contact_2_email',
  'primary_emergency_contact',
  'bank_name',
  'branch_name',
  'branch_code',
  'iban',
  'account_title',
  'account_number',
  'account_type',
  'blood_group',
  'gender',
  'height_cm',
  'weight_kg',
  'has_disability',
  'disability_type',
  'disability_description',
  'has_chronic_condition',
  'chronic_condition_notes',
  'has_known_allergies',
  'allergy_notes',
  'emergency_medication',
  'fitness_status',
  'last_medical_exam_date',
  'next_medical_exam_date',
];

const mandatoryColumns = [
  'employee_id',
  'full_name',
  'father_name',
  'cnic',
  'date_of_birth',
  'department',
  'designation',
  'employment_type',
  'job_status',
  'work_mode',
  'work_location',
  'shift',
  'date_of_joining',
  'primary_phone',
  'permanent_province',
  'permanent_city',
];

const relations = new Set(['father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'friend', 'neighbor', 'other']);
const bankTypes = new Set(['current', 'savings', 'salary']);
const bloodGroups = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']);
const genders = new Set(['male', 'female', 'other']);

function norm(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value.text) return String(value.text).trim();
  return String(value).trim();
}

function key(value) {
  return norm(value).toLowerCase();
}

function boolValue(value) {
  const v = key(value);
  if (!v) return false;
  return ['yes', 'true', '1', 'y'].includes(v);
}

function dateOrNull(value) {
  const v = norm(value);
  if (!v) return null;
  return v;
}

function addError(row, field, message) {
  row.errors.push({ field, message });
}

function addWarning(row, field, message) {
  row.warnings.push({ field, message });
}

async function rowsByQuery(sql, mapFn) {
  const result = await pool.query(sql);
  const map = new Map();
  for (const row of result.rows) {
    map.set(mapFn(row), row);
  }
  return map;
}

export async function loadBulkReferences() {
  const [departments, designations, employmentTypes, jobStatuses, workModes, workLocations, shifts] = await Promise.all([
    rowsByQuery(`SELECT id, department_name FROM public.departments WHERE COALESCE(is_active, true) = true`, (r) => key(r.department_name)),
    rowsByQuery(`SELECT id, title, department_id FROM public.designations WHERE COALESCE(is_active, true) = true`, (r) => key(r.title)),
    rowsByQuery(`SELECT id, type_name FROM public.employment_types WHERE COALESCE(is_active, true) = true`, (r) => key(r.type_name)),
    rowsByQuery(`SELECT id, status_name FROM public.job_statuses WHERE COALESCE(is_active, true) = true`, (r) => key(r.status_name)),
    rowsByQuery(`SELECT id, mode_name FROM public.work_modes WHERE COALESCE(is_active, true) = true`, (r) => key(r.mode_name)),
    rowsByQuery(`SELECT id, location_name FROM public.work_locations WHERE COALESCE(is_active, true) = true`, (r) => key(r.location_name)),
    rowsByQuery(`SELECT id, name FROM public.shifts WHERE COALESCE(is_active, true) = true`, (r) => key(r.name)),
  ]);
  return { departments, designations, employmentTypes, jobStatuses, workModes, workLocations, shifts };
}

export async function buildEmployeeBulkTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EMS';
  const sheet = workbook.addWorksheet(EMPLOYEE_SHEET);
  sheet.columns = columns.map((header) => ({ header, key: header, width: Math.max(18, Math.min(header.length + 6, 34)) }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(columns.length).letter}1` };
  sheet.getRow(1).height = 36;
  sheet.getRow(1).eachCell((cell) => {
    const header = String(cell.value || '');
    const mandatory = mandatoryColumns.includes(header);
    cell.value = mandatory ? `${header} *` : header;
    cell.font = { bold: true, color: { argb: mandatory ? 'FF7F1D1D' : 'FF334155' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: mandatory ? 'FFFFE4E6' : 'FFEFF6FF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    cell.note = mandatory ? 'Mandatory field. This column must be filled before validation.' : 'Optional field. Can be completed later when available.';
  });
  sheet.addRow({
    employee_id: 'EMP0001',
    full_name: 'Ali Khan',
    father_name: 'Ahmed Khan',
    cnic: '42101-1234567-1',
    date_of_birth: '1995-01-15',
    department: 'Human Resources',
    designation: 'HR Executive',
    employment_type: 'Full-Time',
    job_status: 'Active',
    work_mode: 'On-Site',
    work_location: 'Head Office - Karachi',
    shift: 'Morning Shift',
    date_of_joining: '2026-01-01',
    primary_phone: '03000000000',
    permanent_country: 'Pakistan',
    permanent_province: 'Punjab',
    permanent_city: 'Lahore',
    postal_same_as_permanent: 'Yes',
  });
  sheet.getRow(2).height = 22;
  sheet.getRow(2).eachCell((cell) => {
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
    };
  });
  sheet.getColumn('A').eachCell((cell, row) => {
    if (row > 1) cell.dataValidation = { type: 'textLength', operator: 'equal', formulae: [7], showErrorMessage: true, error: 'Use EMP0001 format.' };
  });
  for (let row = 2; row <= 500; row += 1) {
    sheet.getCell(`A${row}`).dataValidation = {
      type: 'textLength',
      operator: 'equal',
      formulae: [7],
      showErrorMessage: true,
      error: 'Use EMP0001 format.',
    };
  }

  const refs = await loadBulkReferences();
  const refData = [
    ['Reference Departments', refs.departments, 'department_name'],
    ['Reference Designations', refs.designations, 'title'],
    ['Reference Employment Types', refs.employmentTypes, 'type_name'],
    ['Reference Job Statuses', refs.jobStatuses, 'status_name'],
    ['Reference Work Modes', refs.workModes, 'mode_name'],
    ['Reference Locations', refs.workLocations, 'location_name'],
    ['Reference Shifts', refs.shifts, 'name'],
  ];
  for (const [name, map, field] of refData) {
    const ws = workbook.addWorksheet(name);
    ws.columns = [{ header: field, key: field, width: 34 }];
    for (const item of map.values()) ws.addRow({ [field]: item[field] });
    ws.getRow(1).font = { bold: true };
  }
  const example = workbook.addWorksheet('Example Row');
  example.columns = [{ header: 'Bulk upload instructions', key: 'text', width: 110 }];
  example.getRow(1).font = { bold: true };
  example.addRow(['Use the Employees sheet. Do not enter UUIDs; use names from reference sheets.']);
  example.addRow(['Red/pink headers with * are mandatory. Blue headers are optional and can be completed later.']);
  example.addRow(['Bulk upload does not create login accounts, salary history, allowances, profile photos, or documents. Complete those after import from the employee profile.']);
  example.addRow(['Employee ID format must be EMP0001.']);
  example.eachRow((row) => {
    row.height = 24;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });
  return workbook.xlsx.writeBuffer();
}

export async function parseEmployeeWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(EMPLOYEE_SHEET);
  if (!sheet) throw new AppError(400, 'INVALID_WORKBOOK', 'Employees sheet is mandatory.');
  const headers = {};
  sheet.getRow(1).eachCell((cell, index) => {
    headers[index] = norm(cell.value).replace(/\s*\*$/, '');
  });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    for (const [index, header] of Object.entries(headers)) {
      if (columns.includes(header)) data[header] = norm(row.getCell(Number(index)).value);
    }
    if (Object.values(data).some(Boolean)) rows.push({ rowNumber, data });
  });
  return rows;
}

export async function validateEmployeeRows(inputRows, refs = null) {
  const references = refs || await loadBulkReferences();
  const seenEmployeeIds = new Set();
  const seenCnics = new Set();
  const employeeIds = inputRows.map((r) => norm(r.data.employee_id)).filter(Boolean);
  const cnics = inputRows.map((r) => norm(r.data.cnic)).filter(Boolean);
  const existingEmployees = employeeIds.length
    ? await pool.query(`SELECT employee_id FROM public.employee_info WHERE employee_id = ANY($1::varchar[])`, [employeeIds])
    : { rows: [] };
  const existingCnics = cnics.length
    ? await pool.query(`SELECT cnic FROM public.employee_info WHERE cnic = ANY($1::varchar[])`, [cnics])
    : { rows: [] };
  const existingEmployeeSet = new Set(existingEmployees.rows.map((r) => r.employee_id));
  const existingCnicSet = new Set(existingCnics.rows.map((r) => r.cnic));

  const rows = inputRows.map(({ rowNumber, data }) => {
    const out = { rowNumber, data, mapped: null, errors: [], warnings: [] };
    for (const column of mandatoryColumns) {
      if (!norm(data[column])) addError(out, column, `${column} is mandatory.`);
    }
    const employeeId = norm(data.employee_id);
    if (employeeId && !/^EMP\d{4}$/.test(employeeId)) addError(out, 'employee_id', 'Employee ID must use EMP0001 format.');
    if (employeeId && seenEmployeeIds.has(employeeId)) addError(out, 'employee_id', 'Duplicate employee ID in uploaded file.');
    if (employeeId && existingEmployeeSet.has(employeeId)) addError(out, 'employee_id', 'Employee ID already exists.');
    if (employeeId) seenEmployeeIds.add(employeeId);
    const cnic = norm(data.cnic);
    if (cnic && seenCnics.has(cnic)) addError(out, 'cnic', 'Duplicate CNIC in uploaded file.');
    if (cnic && existingCnicSet.has(cnic)) addError(out, 'cnic', 'CNIC already exists.');
    if (cnic) seenCnics.add(cnic);

    const department = references.departments.get(key(data.department));
    const designation = references.designations.get(key(data.designation));
    const employmentType = references.employmentTypes.get(key(data.employment_type));
    const jobStatus = references.jobStatuses.get(key(data.job_status));
    const workMode = references.workModes.get(key(data.work_mode));
    const workLocation = references.workLocations.get(key(data.work_location));
    const shift = references.shifts.get(key(data.shift));
    if (data.department && !department) addError(out, 'department', 'Department does not exist.');
    if (data.designation && !designation) addError(out, 'designation', 'Designation does not exist.');
    if (department && designation && designation.department_id !== department.id) addError(out, 'designation', 'Designation is not linked to selected department.');
    if (data.employment_type && !employmentType) addError(out, 'employment_type', 'Employment type does not exist.');
    if (data.job_status && !jobStatus) addError(out, 'job_status', 'Job status does not exist.');
    if (data.work_mode && !workMode) addError(out, 'work_mode', 'Work mode does not exist.');
    if (data.work_location && !workLocation) addError(out, 'work_location', 'Work location does not exist.');
    if (data.shift && !shift) addError(out, 'shift', 'Shift does not exist.');
    if (norm(data.permanent_country || 'Pakistan') !== 'Pakistan') addError(out, 'permanent_country', 'Country must be Pakistan.');
    if (data.emergency_contact_1_relation && !relations.has(key(data.emergency_contact_1_relation))) addError(out, 'emergency_contact_1_relation', 'Invalid emergency contact relation.');
    if (data.account_type && !bankTypes.has(key(data.account_type))) addError(out, 'account_type', 'Invalid bank account type.');
    if (data.blood_group && !bloodGroups.has(norm(data.blood_group))) addError(out, 'blood_group', 'Invalid blood group.');
    if (data.gender && !genders.has(key(data.gender))) addError(out, 'gender', 'Invalid gender.');

    if (!data.bank_name || !data.iban || !data.account_title) addWarning(out, 'bankInfo', 'Bank info is incomplete and can be completed later.');
    if (!data.blood_group && !data.gender) addWarning(out, 'medicalInfo', 'Medical info is incomplete and can be completed later.');
    addWarning(out, 'accountInfo', 'Login account is not created by bulk upload.');
    addWarning(out, 'salaryInfo', 'Salary history must be added after import.');
    addWarning(out, 'attachments', 'Profile photo and documents must be uploaded after import.');

    if (out.errors.length === 0) {
      out.mapped = mapBulkRow(data, { department, designation, employmentType, jobStatus, workMode, workLocation, shift });
    }
    return out;
  });
  return summarizeRows(rows);
}

function mapBulkRow(data, refs) {
  const sameAsPermanent = boolValue(data.postal_same_as_permanent);
  const permanent = {
    country: 'Pakistan',
    province: norm(data.permanent_province),
    district: norm(data.permanent_district) || null,
    city: norm(data.permanent_city),
    town: norm(data.permanent_town) || null,
    street: norm(data.permanent_street) || null,
    postal_code: norm(data.permanent_postal_code) || null,
  };
  const postal = sameAsPermanent ? permanent : {
    country: norm(data.postal_country || 'Pakistan'),
    province: norm(data.postal_province),
    district: norm(data.postal_district) || null,
    city: norm(data.postal_city),
    town: norm(data.postal_town) || null,
    street: norm(data.postal_street) || null,
    postal_code: norm(data.postal_postal_code) || null,
  };
  return {
    employee_id: norm(data.employee_id),
    personalInfo: {
      name: norm(data.full_name),
      father_name: norm(data.father_name),
      cnic: norm(data.cnic),
      date_of_birth: norm(data.date_of_birth),
    },
    jobInfo: {
      department_id: refs.department.id,
      designation_id: refs.designation.id,
      employment_type_id: refs.employmentType.id,
      job_status_id: refs.jobStatus.id,
      work_mode_id: refs.workMode.id,
      work_location_id: refs.workLocation.id,
      shift_id: refs.shift.id,
      date_of_joining: norm(data.date_of_joining),
      date_of_exit: dateOrNull(data.date_of_exit),
      probation_end_date: dateOrNull(data.probation_end_date),
      contract_end_date: dateOrNull(data.contract_end_date),
    },
    employeeContact: {
      primary_phone: norm(data.primary_phone),
      alternate_phone: norm(data.alternate_phone) || null,
      same_as_permanent: sameAsPermanent,
      permanent_address: permanent,
      postal_address: sameAsPermanent ? null : postal,
    },
    emergencyContacts: data.emergency_contact_1_full_name ? {
      e_contact_1_relation: key(data.emergency_contact_1_relation || 'other'),
      e_contact_1_full_name: norm(data.emergency_contact_1_full_name),
      e_contact_1_phone: norm(data.emergency_contact_1_phone),
      e_contact_1_phone_country_code: norm(data.emergency_contact_1_phone_country_code || '+92'),
      e_contact_1_email: norm(data.emergency_contact_1_email) || null,
      e_contact_2_relation: key(data.emergency_contact_2_relation) || null,
      e_contact_2_full_name: norm(data.emergency_contact_2_full_name) || null,
      e_contact_2_phone: norm(data.emergency_contact_2_phone) || null,
      e_contact_2_phone_country_code: norm(data.emergency_contact_2_phone_country_code || '+92'),
      e_contact_2_email: norm(data.emergency_contact_2_email) || null,
      primary_contact: Number(norm(data.primary_emergency_contact)) === 2 ? 2 : 1,
    } : null,
    bankInfo: data.bank_name ? {
      bank_name: norm(data.bank_name),
      branch_name: norm(data.branch_name) || null,
      branch_code: norm(data.branch_code) || null,
      iban: norm(data.iban),
      account_title: norm(data.account_title),
      account_number: norm(data.account_number) || null,
      account_type: key(data.account_type) || null,
    } : null,
    medicalInfo: {
      blood_group: norm(data.blood_group) || null,
      date_of_birth: norm(data.date_of_birth),
      gender: key(data.gender) || null,
      height_cm: norm(data.height_cm) ? Number(norm(data.height_cm)) : null,
      weight_kg: norm(data.weight_kg) ? Number(norm(data.weight_kg)) : null,
      has_disability: boolValue(data.has_disability),
      disability_type: norm(data.disability_type) || null,
      disability_description: norm(data.disability_description) || null,
      has_chronic_condition: boolValue(data.has_chronic_condition),
      chronic_condition_notes: norm(data.chronic_condition_notes) || null,
      has_known_allergies: boolValue(data.has_known_allergies),
      allergy_notes: norm(data.allergy_notes) || null,
      emergency_medication: norm(data.emergency_medication) || null,
      fitness_status: norm(data.fitness_status) || null,
      last_medical_exam_date: dateOrNull(data.last_medical_exam_date),
      next_medical_exam_date: dateOrNull(data.next_medical_exam_date),
    },
  };
}

function summarizeRows(rows) {
  return {
    total_rows: rows.length,
    valid_rows: rows.filter((r) => r.errors.length === 0).length,
    error_rows: rows.filter((r) => r.errors.length > 0).length,
    warning_rows: rows.filter((r) => r.warnings.length > 0).length,
    rows,
  };
}

export async function validateEmployeeWorkbook(buffer, userId, requestContext = {}) {
  const parsed = await parseEmployeeWorkbook(buffer);
  const preview = await validateEmployeeRows(parsed);
  await recordActivityLog({
    userId,
    action: 'BULK_EMPLOYEE_VALIDATE',
    entityType: 'employees',
    meta: { total_rows: preview.total_rows, valid_rows: preview.valid_rows, error_rows: preview.error_rows },
    requestContext,
    bestEffort: true,
  });
  return preview;
}

export async function importBulkEmployees(rows, userId, requestContext = {}) {
  const validRows = (rows || []).filter((row) => row?.mapped && (!row.errors || row.errors.length === 0));
  const imported = [];
  const failed = [];
  for (const row of validRows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await insertBulkEmployee(client, row.mapped, userId);
      await recordActivityLog({
        userId,
        action: 'BULK_EMPLOYEE_IMPORTED',
        entityType: 'employees',
        entityId: row.mapped.employee_id,
        meta: { row_number: row.rowNumber, employee_id: row.mapped.employee_id },
        requestContext,
        db: client,
      });
      await client.query('COMMIT');
      imported.push({ rowNumber: row.rowNumber, employee_id: row.mapped.employee_id });
    } catch (error) {
      await client.query('ROLLBACK');
      failed.push({ rowNumber: row.rowNumber, employee_id: row.mapped?.employee_id, message: error.message });
    } finally {
      client.release();
    }
  }
  await recordActivityLog({
    userId,
    action: 'BULK_EMPLOYEE_IMPORT_SUMMARY',
    entityType: 'employees',
    meta: { requested_rows: validRows.length, imported: imported.length, failed: failed.length },
    requestContext,
    bestEffort: true,
  });
  return {
    imported_count: imported.length,
    failed_count: failed.length,
    imported,
    failed,
    next_actions: ['Create login accounts', 'Add salary history', 'Add allowances', 'Upload profile photos', 'Upload employee documents'],
  };
}

async function insertBulkEmployee(client, data, createdByUserId) {
  const { employee_id: employeeId, personalInfo, jobInfo, employeeContact, emergencyContacts, bankInfo, medicalInfo } = data;
  await client.query(
    `INSERT INTO public.employee_info (employee_id, name, father_name, cnic, date_of_birth)
     VALUES ($1, $2, $3, $4, $5)`,
    [employeeId, personalInfo.name, personalInfo.father_name, personalInfo.cnic, personalInfo.date_of_birth]
  );
  await client.query(
    `INSERT INTO public.job_info (employee_id, department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit, probation_end_date, contract_end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [employeeId, jobInfo.department_id, jobInfo.designation_id, jobInfo.employment_type_id, jobInfo.job_status_id, jobInfo.work_mode_id, jobInfo.work_location_id, jobInfo.shift_id, jobInfo.date_of_joining, jobInfo.date_of_exit, jobInfo.probation_end_date, jobInfo.contract_end_date]
  );
  if (employeeContact?.primary_phone) {
    const permanent = employeeContact.permanent_address || {};
    const postal = employeeContact.same_as_permanent ? permanent : (employeeContact.postal_address || {});
    await client.query(
      `INSERT INTO public.employee_contacts (employee_id, primary_phone, alternate_phone, permanent_country, permanent_province, permanent_district, permanent_city, permanent_town, permanent_street, permanent_postal_code, postal_country, postal_province, postal_district, postal_city, postal_town, postal_street, postal_postal_code, same_as_permanent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [employeeId, employeeContact.primary_phone, employeeContact.alternate_phone, permanent.country || 'Pakistan', permanent.province || null, permanent.district || null, permanent.city || null, permanent.town || null, permanent.street || null, permanent.postal_code || null, postal.country || 'Pakistan', postal.province || null, postal.district || null, postal.city || null, postal.town || null, postal.street || null, postal.postal_code || null, Boolean(employeeContact.same_as_permanent)]
    );
  }
  if (emergencyContacts) {
    await client.query(
      `INSERT INTO public.emergency_contacts (employee_id, e_contact_1_relation, e_contact_1_full_name, e_contact_1_phone, e_contact_1_phone_country_code, e_contact_1_email, e_contact_2_relation, e_contact_2_full_name, e_contact_2_phone, e_contact_2_phone_country_code, e_contact_2_email, primary_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [employeeId, emergencyContacts.e_contact_1_relation, emergencyContacts.e_contact_1_full_name, emergencyContacts.e_contact_1_phone, emergencyContacts.e_contact_1_phone_country_code || '+92', emergencyContacts.e_contact_1_email || null, emergencyContacts.e_contact_2_relation || null, emergencyContacts.e_contact_2_full_name || null, emergencyContacts.e_contact_2_phone || null, emergencyContacts.e_contact_2_phone_country_code || '+92', emergencyContacts.e_contact_2_email || null, emergencyContacts.primary_contact || 1]
    );
  }
  if (bankInfo) {
    await client.query(
      `INSERT INTO public.employee_bank_accounts (employee_id, bank_name, branch_name, branch_code, iban, account_title, account_number, account_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [employeeId, bankInfo.bank_name, bankInfo.branch_name || null, bankInfo.branch_code || null, bankInfo.iban, bankInfo.account_title, bankInfo.account_number || null, bankInfo.account_type || null]
    );
  }
  if (medicalInfo) {
    await client.query(
      `INSERT INTO public.employee_medical (employee_id, blood_group, date_of_birth, gender, height_cm, weight_kg, has_disability, disability_type, disability_description, has_chronic_condition, chronic_condition_notes, has_known_allergies, allergy_notes, emergency_medication, fitness_status, last_medical_exam_date, next_medical_exam_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [employeeId, medicalInfo.blood_group || null, medicalInfo.date_of_birth || null, medicalInfo.gender || null, medicalInfo.height_cm || null, medicalInfo.weight_kg || null, medicalInfo.has_disability || false, medicalInfo.disability_type || null, medicalInfo.disability_description || null, medicalInfo.has_chronic_condition || false, medicalInfo.chronic_condition_notes || null, medicalInfo.has_known_allergies || false, medicalInfo.allergy_notes || null, medicalInfo.emergency_medication || null, medicalInfo.fitness_status || null, medicalInfo.last_medical_exam_date || null, medicalInfo.next_medical_exam_date || null]
    );
  }
  const joiningYear = new Date(jobInfo.date_of_joining).getUTCFullYear();
  const entitlementYear = Math.max(joiningYear, new Date().getUTCFullYear());
  await initializeBalances(employeeId, entitlementYear, { db: client });
  return { employee_id: employeeId, created_by: createdByUserId };
}
