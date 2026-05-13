/**
 * Employees, HR, attendance, procurement — loaded by master_seed.js
 */

import {
  padEmp,
  mulberry32,
  batchInsert,
  fmtDate,
  addMonths,
  toDMY,
  getWeekdaysBetween,
  pakistanHolidaySet,
} from './master_seed_helpers.js';

const TODAY = '2026-05-12';

const FIRST_NAMES = [
  'Muhammad', 'Fatima', 'Ali', 'Ayesha', 'Haris', 'Zainab', 'Usman', 'Sana', 'Bilal', 'Noor',
  'Ahmed', 'Sara', 'Hassan', 'Maryam', 'Omar', 'Amina', 'Hamza', 'Khadija', 'Zaid', 'Hira',
  'Tariq', 'Rabia', 'Shahid', 'Nida', 'Imran', 'Sadia', 'Waqas', 'Shazia', 'Naveed', 'Amna',
  'Danish', 'Hina', 'Kamran', 'Asma', 'Yasir', 'Saba', 'Adnan', 'Nimra', 'Farhan', 'Mahnoor',
  'Talha', 'Iqra', 'Zeeshan', 'Laiba', 'Asad', 'Mariam', 'Saad', 'Hafsa', 'Rizwan', 'Areeba',
  'Junaid', 'Anum', 'Faisal', 'Mehwish', 'Salman', 'Ifrah', 'Moiz', 'Palwasha', 'Azfar', 'Ramsha',
];

const LAST_NAMES = [
  'Ahmed', 'Khan', 'Siddiqui', 'Malik', 'Raza', 'Hussain', 'Ali', 'Sheikh', 'Butt', 'Chaudhry',
  'Mirza', 'Qureshi', 'Abbasi', 'Farooq', 'Hashmi', 'Dar', 'Shah', 'Rana', 'Cheema', 'Tariq',
  'Iqbal', 'Akhtar', 'Aslam', 'Saleem', 'Yousuf', 'Ansari', 'Bhatti', 'Siddiqui', 'Pervaiz',
  'Mehmood', 'Rafique', 'Ismail', 'Zaman', 'Haider', 'Nawaz', 'Aziz', 'Latif', 'Hamid', 'Anwar',
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function deptSlots520(D) {
  return [
    ...Array(22).fill(D.itSup),
    ...Array(24).fill(D.itDev),
    ...Array(27).fill(D.sweFe),
    ...Array(32).fill(D.sweBe),
    ...Array(14).fill(D.sweMob),
    ...Array(18).fill(D.sweQa),
    ...Array(17).fill(D.sweDevOps),
    ...Array(30).fill(D.salesKhi),
    ...Array(30).fill(D.salesLhr),
    ...Array(29).fill(D.salesIsb),
    ...Array(27).fill(D.hr),
    ...Array(22).fill(D.proc),
    ...Array(27).fill(D.fin),
    ...Array(54).fill(D.opsFe),
    ...Array(53).fill(D.opsInst),
    ...Array(54).fill(D.cs),
    ...Array(40).fill(D.adm),
  ];
}

function designationForDept(deptId, joinIso, rng, DES, D) {
  const y = parseInt(joinIso.slice(0, 4), 10);
  const senior = y < 2005;
  if (deptId === D.itSup || deptId === D.itDev) return senior ? DES['IT Manager'] : DES['IT Support Engineer'];
  if (deptId === D.sweFe) return senior ? DES['Senior Frontend Developer'] : DES['Frontend Developer'];
  if (deptId === D.sweBe) return senior ? DES['Senior Backend Developer'] : DES['Backend Developer'];
  if (deptId === D.sweMob) return senior ? DES['Senior Mobile Developer'] : DES['Mobile Developer'];
  if (deptId === D.sweQa) return senior ? DES['Senior QA Engineer'] : DES['QA Engineer'];
  if (deptId === D.sweDevOps) return senior ? DES['Senior DevOps Engineer'] : DES['DevOps Engineer'];
  if (deptId === D.hr) return senior ? DES['HR Manager'] : DES['HR Executive'];
  if (deptId === D.proc) return senior ? DES['Procurement Manager'] : DES['Procurement Officer'];
  if (deptId === D.fin) return senior ? DES['Finance Manager'] : DES['Finance Officer'];
  if (deptId === D.opsFe || deptId === D.opsInst) return senior ? DES['Operations Manager'] : DES['Field Engineer'];
  if (deptId === D.cs) return senior ? DES['Customer Support Manager'] : DES['Support Executive'];
  if (deptId === D.adm) return senior ? DES['General Manager'] : DES['Team Lead'];
  if ([D.sales, D.salesKhi, D.salesLhr, D.salesIsb].includes(deptId))
    return senior ? DES['Sales Manager'] : DES['Sales Executive'];
  return DES['Software Engineer'];
}

export async function seedEmployeesAndHR(client, ctx) {
  const {
    D,
    DES,
    ET,
    JS,
    WM,
    WL,
    SH,
    LT,
    AT,
    roleIds,
    hrManagerRoleId,
    hrExecRoleId,
    employeeRoleId,
    superAdminRoleId,
    stdPass,
    hrMgrPass,
    superPass,
    PROD,
  } = ctx;

  const slots = deptSlots520(D);
  const productKeys = Object.keys(PROD);
  const holidaySet = pakistanHolidaySet();
  const titleByDesigId = Object.fromEntries(Object.entries(DES).map(([t, id]) => [id, t]));

  const hrManagerEmpId = padEmp(4);
  const hrExecEmpId = padEmp(5);

  const joinSpread = (n) => {
    const rng = mulberry32(n * 31337);
    const t = rng();
    if (t < 0.25)
      return `1990-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    if (t < 0.55)
      return `200${Math.floor(rng() * 10)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    return `201${Math.floor(rng() * 10)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
  };

  const empRows = [];
  const jobRows = [];
  const ecRows = [];
  const bankRows = [];
  const medRows = [];
  const salaryRows = [];
  const userMeta = [];

  for (let i = 1; i <= 520; i++) {
    const empId = padEmp(i);
    const rng = mulberry32(i * 7919);
    const deptId = slots[i - 1];
    const fn = pick(FIRST_NAMES, rng);
    const ln = pick(LAST_NAMES, rng);
    let name = `${fn} ${ln}`;
    if (i === 1) name = 'Muhammad Bilal Ahmed';
    const father = `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`;
    const cnic = `42101-${String(1000000 + i).slice(-7)}-${i % 10}`;
    const dobIso = `${1956 + Math.floor(rng() * 52)}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    let joinIso = joinSpread(i);
    if (joinIso > TODAY) joinIso = TODAY;
    const designationId = designationForDept(deptId, joinIso, rng, DES, D);

    let empType = ET['Full-Time'];
    const jt = rng();
    if (jt < 0.08) empType = ET['Contract'];
    else if (jt < 0.12) empType = ET['Internship'];
    else if (jt < 0.18) empType = ET['Probationary'];

    let jobStat = JS.Active;
    let probationEnd = null;
    let contractEnd = null;
    let exitDate = null;
    if (empType === ET['Probationary']) {
      jobStat = JS.Probation;
      probationEnd = addMonths(joinIso, 3);
    }
    if (empType === ET['Contract']) contractEnd = addMonths(joinIso, 6 + Math.floor(rng() * 12));
    if (i >= 400 && i < 440) {
      jobStat = rng() < 0.5 ? JS.Terminated : JS.Resigned;
      exitDate = `202${Math.floor(rng() * 6)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    }

    let wm = WM['On-Site'];
    if (deptId === D.opsFe || deptId === D.opsInst) wm = WM.Field;
    else if ([D.sweFe, D.sweBe, D.sweMob, D.sweQa, D.sweDevOps].includes(deptId)) {
      const u = rng();
      if (u < 0.4) wm = WM.Remote;
      else if (u < 0.8) wm = WM.Hybrid;
    } else if ([D.salesKhi, D.salesLhr, D.salesIsb, D.sales].includes(deptId)) {
      wm = rng() < 0.55 ? WM['On-Site'] : WM.Hybrid;
    }

    let wl = WL['Head Office - Karachi'];
    if (rng() < 0.25) wl = WL['Branch Office - Lahore'];
    else if (rng() < 0.4) wl = WL['Branch Office - Islamabad'];
    else if (deptId === D.opsFe && rng() < 0.5) wl = WL['Client Site - Karachi'];

    let shiftId = SH['Morning Shift'];
    if (deptId === D.opsFe || deptId === D.opsInst) shiftId = SH['Field Shift'];
    else if (rng() < 0.08) shiftId = SH['Evening Shift'];
    else if (rng() < 0.12) shiftId = SH['Flexible Shift'];

    empRows.push([empId, name, father, cnic, toDMY(dobIso)]);
    jobRows.push([
      empId,
      deptId,
      designationId,
      empType,
      jobStat,
      wm,
      wl,
      shiftId,
      joinIso,
      exitDate,
      probationEnd,
      contractEnd,
    ]);

    const phone = `03${Math.floor(rng() * 10)}${String(Math.floor(rng() * 100000000)).padStart(8, '0')}`;
    const hasEc2 = rng() < 0.58;
    ecRows.push([
      empId,
      phone,
      rng() < 0.3 ? phone : null,
      `House ${10 + i}, Block ${1 + (i % 8)}, Gulshan-e-Iqbal, Karachi`,
      i % 5 === 0 ? `Plot ${i}, DHA Phase ${1 + (i % 6)}, Lahore` : `House ${10 + i}, Block ${1 + (i % 8)}, Gulshan-e-Iqbal, Karachi`,
      rng() < 0.5 ? 'father' : rng() < 0.75 ? 'mother' : 'wife',
      `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`,
      phone,
      '+92',
      rng() < 0.3 ? `${fn.toLowerCase()}.family@example.com` : null,
      hasEc2 ? 'brother' : null,
      hasEc2 ? `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}` : null,
      hasEc2 ? `03${Math.floor(rng() * 10)}${String(Math.floor(rng() * 100000000)).padStart(8, '0')}` : null,
      '+92',
      null,
      1,
    ]);

    const banks = [
      'HBL',
      'MCB Bank',
      'UBL',
      'Bank Alfalah',
      'Meezan Bank',
      'Allied Bank',
      'JS Bank',
      'Faysal Bank',
      'National Bank of Pakistan',
      'Standard Chartered Pakistan',
    ];
    const verified = rng() < 0.85;
    bankRows.push([
      empId,
      pick(banks, rng),
      'Main Branch Karachi',
      String(1000 + (i % 9000)).padStart(4, '0'),
      `PK36ALFA${String(i).padStart(16, '0')}`,
      name,
      String(1000000000 + i),
      rng() < 0.85 ? 'salary' : 'current',
      verified,
      verified ? joinIso : null,
    ]);

    const bgPool = ['O+', 'O+', 'O+', 'A+', 'A+', 'A+', 'B+', 'B+', 'AB+', 'unknown'];
    const gender = rng() < 0.65 ? 'male' : rng() < 0.98 ? 'female' : 'other';
    const exam = `${2020 + Math.floor(rng() * 6)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`;
    medRows.push([
      empId,
      pick(bgPool, rng),
      dobIso,
      gender,
      gender === 'female' ? 152 + Math.floor(rng() * 18) : 165 + Math.floor(rng() * 20),
      gender === 'female' ? 50 + Math.floor(rng() * 25) : 60 + Math.floor(rng() * 35),
      rng() < 0.05,
      rng() < 0.05 ? 'mobility' : null,
      rng() < 0.05 ? 'Accessible workstation assigned' : null,
      rng() < 0.1,
      rng() < 0.1 ? 'Hypertension — monitored' : null,
      rng() < 0.15,
      rng() < 0.15 ? 'Seasonal allergy' : null,
      null,
      rng() < 0.7 ? 'fit' : rng() < 0.95 ? 'fit_with_restrictions' : 'under_review',
      exam,
      addMonths(exam, 12),
      null,
    ]);

    const baseSalary = 45000 + Math.floor(rng() * 500000);
    salaryRows.push([empId, baseSalary, 'PKR', joinIso, null, true, true, 'Initial', null, null]);

    let roleId = employeeRoleId;
    if (i === 1) roleId = superAdminRoleId;
    else if (empId === hrManagerEmpId) roleId = hrManagerRoleId;
    else if (empId === hrExecEmpId) roleId = hrExecRoleId;

    let emailLocal = `${fn}.${ln}`.toLowerCase().replace(/[^a-z]/g, '') + i;
    let email = `${emailLocal}@esspl.com.pk`;
    if (empId === padEmp(1)) {
      email = 'superadmin@esspl.com.pk';
    }
    const mustChange = joinIso >= '2025-11-12';
    const pwdChangedAt = mustChange ? null : `${joinIso}T10:00:00.000Z`;
    userMeta.push({ empId, email, roleId, mustChange, pwdChangedAt });
  }

  await batchInsert(
    client,
    `INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth)`,
    ['employee_id', 'name', 'father_name', 'cnic', 'date_of_birth'],
    empRows
  );
  console.log('  employee_info 520');

  await batchInsert(
    client,
    `INSERT INTO job_info (employee_id, department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit, probation_end_date, contract_end_date)`,
    [
      'employee_id',
      'department_id',
      'designation_id',
      'employment_type_id',
      'job_status_id',
      'work_mode_id',
      'work_location_id',
      'shift_id',
      'date_of_joining',
      'date_of_exit',
      'probation_end_date',
      'contract_end_date',
    ],
    jobRows
  );

  await batchInsert(
    client,
    `INSERT INTO emergency_contacts (employee_id, contact_1, contact_2, perment_address, postal_address, e_contact_1_relation, e_contact_1_full_name, e_contact_1_phone, e_contact_1_phone_country_code, e_contact_1_email, e_contact_2_relation, e_contact_2_full_name, e_contact_2_phone, e_contact_2_phone_country_code, e_contact_2_email, primary_contact)`,
    [
      'employee_id',
      'contact_1',
      'contact_2',
      'perment_address',
      'postal_address',
      'e_contact_1_relation',
      'e_contact_1_full_name',
      'e_contact_1_phone',
      'e_contact_1_phone_country_code',
      'e_contact_1_email',
      'e_contact_2_relation',
      'e_contact_2_full_name',
      'e_contact_2_phone',
      'e_contact_2_phone_country_code',
      'e_contact_2_email',
      'primary_contact',
    ],
    ecRows
  );

  for (const row of bankRows) {
    await client.query(
      `
      INSERT INTO employee_bank_accounts (
        employee_id, bank_name, branch_name, branch_code, iban, account_title, account_number, account_type,
        is_verified, verified_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::bank_account_type,$9,$10)
    `,
      row
    );
  }

  await batchInsert(
    client,
    `INSERT INTO employee_medical (
      employee_id, blood_group, date_of_birth, gender, height_cm, weight_kg,
      has_disability, disability_type, disability_description, has_chronic_condition, chronic_condition_notes,
      has_known_allergies, allergy_notes, emergency_medication, fitness_status, last_medical_exam_date, next_medical_exam_date, updated_by
    )`,
    [
      'employee_id',
      'blood_group',
      'date_of_birth',
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
      'updated_by',
    ],
    medRows
  );

  for (const u of userMeta) {
    const pw = u.empId === padEmp(1) ? superPass : u.empId === hrManagerEmpId ? hrMgrPass : stdPass;
    await client.query(
      `
      INSERT INTO users (employee_id, email, password, role_id, must_change_password, password_changed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [u.empId, u.email, pw, u.roleId, u.mustChange, u.pwdChangedAt]
    );
  }
  console.log('  users 520');

  const userRowsDb = await client.query(`SELECT id, employee_id FROM users`);
  const uidByEmp = Object.fromEntries(userRowsDb.rows.map((r) => [r.employee_id, r.id]));
  const hrUid = uidByEmp[hrManagerEmpId];
  const hrExecUid = uidByEmp[hrExecEmpId];

  await client.query(`UPDATE employee_medical SET updated_by = $1 WHERE updated_by IS NULL`, [hrUid]);
  await client.query(
    `UPDATE employee_bank_accounts SET verified_by = $1 WHERE is_verified = true AND verified_by IS NULL`,
    [hrUid]
  );

  for (const row of salaryRows) {
    await client.query(
      `
      INSERT INTO employee_salary (
        employee_id, basic_salary, currency, effective_from, effective_to, is_current, is_active,
        revision_type, revision_percent, revision_reason, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
      [...row.slice(0, 10), hrUid]
    );
  }
  console.log('  employee_salary');

  for (let i = 1; i <= 520; i++) {
    const rng = mulberry32(i * 4444);
    const empId = padEmp(i);
    const mgr = i <= 40 || rng() < 0.08;
    await client.query(
      `INSERT INTO employee_allowances (employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by)
       VALUES ($1, $2, $3, true, true, true, $4)`,
      [empId, AT['House Rent Allowance'], Math.round(40 + rng() * 10), hrUid]
    );
    await client.query(
      `INSERT INTO employee_allowances (employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by)
       VALUES ($1, $2, $3, false, true, true, $4)`,
      [empId, AT['Medical Allowance'], 3000 + Math.floor(rng() * 7000), hrUid]
    );
    await client.query(
      `INSERT INTO employee_allowances (employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by)
       VALUES ($1, $2, $3, false, true, true, $4)`,
      [empId, AT['Transport Allowance'], 2000 + Math.floor(rng() * 2000), hrUid]
    );
    if (mgr || rng() < 0.35) {
      await client.query(
        `INSERT INTO employee_allowances (employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by)
         VALUES ($1, $2, $3, false, true, true, $4)`,
        [empId, AT['Fuel Allowance'], 3000 + Math.floor(rng() * 3000), hrUid]
      );
      await client.query(
        `INSERT INTO employee_allowances (employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by)
         VALUES ($1, $2, $3, false, true, true, $4)`,
        [empId, AT['Mobile Allowance'], 1500 + Math.floor(rng() * 1000), hrUid]
      );
    }
  }

  const jhRows = [];
  for (let i = 1; i <= 520; i++) {
    const empId = padEmp(i);
    const ji = jobRows[i - 1];
    jhRows.push([empId, ji[1], ji[2], null, ji[8], null]);
    const rng = mulberry32(i * 3333);
    if (rng() < 0.14 && i > 35) {
      jhRows.push([empId, ji[1], ji[2], padEmp(Math.max(1, i - 15)), `${ji[8].slice(0, 4)}-01-01`, ji[8]]);
    }
  }
  await batchInsert(
    client,
    `INSERT INTO employee_job_history (employee_id, department_id, designation_id, manager_emp_id, start_date, end_date)`,
    ['employee_id', 'department_id', 'designation_id', 'manager_emp_id', 'start_date', 'end_date'],
    jhRows
  );

  const deptIds = Object.values(D);
  const ltKeys = Object.keys(LT);
  const policyYears = [2023, 2024, 2025, 2026];
  const daysMap = {
    'Annual Leave': 14,
    'Sick Leave': 10,
    'Casual Leave': 12,
    'Maternity Leave': 90,
    'Paternity Leave': 3,
    'Unpaid Leave': 30,
    'Compensatory Leave': 5,
    'Bereavement Leave': 3,
  };

  const polRows = [];
  for (const did of deptIds) {
    for (const y of policyYears) {
      for (const nk of ltKeys) {
        polRows.push([did, LT[nk], daysMap[nk] ?? 10, y, true]);
      }
    }
  }
  await batchInsert(
    client,
    `INSERT INTO leave_policies (department_id, leave_type_id, days_allowed, year, is_active)`,
    ['department_id', 'leave_type_id', 'days_allowed', 'year', 'is_active'],
    polRows
  );

  const capRows = deptIds.map((did) => {
    const ops = did === D.ops || did === D.opsFe || did === D.opsInst;
    return [did, ops ? 30 : 50, true, hrUid, hrUid];
  });
  await batchInsert(
    client,
    `INSERT INTO leave_capacity_config (department_id, max_percent, is_active, created_by, updated_by)`,
    ['department_id', 'max_percent', 'is_active', 'created_by', 'updated_by'],
    capRows
  );

  const leaveBalRows = [];
  for (let i = 1; i <= 520; i++) {
    if (i >= 400 && i < 440) continue;
    const empId = padEmp(i);
    const rng = mulberry32(i * 8888);
    for (const y of policyYears) {
      for (const nk of ltKeys) {
        const allowed = daysMap[nk] ?? 10;
        const used = Math.min(allowed, Math.floor(rng() * (allowed + 1)));
        leaveBalRows.push([empId, LT[nk], y, allowed, used]);
      }
    }
  }
  await batchInsert(
    client,
    `INSERT INTO leave_balances (employee_id, leave_type_id, year, balance, used)`,
    ['employee_id', 'leave_type_id', 'year', 'balance', 'used'],
    leaveBalRows
  );

  const lrRows = [];
  for (let k = 0; k < 800; k++) {
    const rng = mulberry32(k * 12345);
    const empNum = 1 + Math.floor(rng() * 520);
    const empId = padEmp(empNum);
    const year = 1990 + Math.floor(rng() * 36);
    const month = Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const start = new Date(Date.UTC(year, month, day));
    const dur = 1 + Math.floor(rng() * 14);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + dur);
    const statusPool = ['pending', 'approved', 'rejected', 'cancelled'];
    const w = rng();
    const st = w < 0.6 ? 'approved' : w < 0.8 ? 'pending' : w < 0.92 ? 'rejected' : 'cancelled';
    const ltName = ltKeys[Math.floor(rng() * ltKeys.length)];
    const reviewed = st === 'approved' || st === 'rejected' ? hrUid : null;
    const reviewedAt =
      reviewed ? `${fmtDate(end)} 14:00:00+00` : null;
    lrRows.push([
      empId,
      LT[ltName],
      fmtDate(start),
      fmtDate(end),
      rng() < 0.1 ? fmtDate(start) : null,
      'Personal / medical leave',
      st,
      reviewed,
      reviewedAt,
      st === 'rejected' ? 'Insufficient backup coverage' : null,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, end_by_force, reason, status, reviewed_by, reviewed_at, rejection_reason)`,
    [
      'employee_id',
      'leave_type_id',
      'start_date',
      'end_date',
      'end_by_force',
      'reason',
      'status',
      'reviewed_by',
      'reviewed_at',
      'rejection_reason',
    ],
    lrRows
  );

  const rules = [
    ['Late Arrival (1st offense)', 500, 'flat'],
    ['Late Arrival (Repeated)', 1000, 'flat'],
    ['Unauthorized Absence', 2000, 'flat'],
    ['Policy Violation', 5000, 'flat'],
    ['Dress Code Violation', 300, 'flat'],
    ['Misconduct', 10000, 'flat'],
    ['Performance Deduction', 5, 'percentage'],
    ['Attendance Shortage', 2, 'percentage'],
  ];
  const ruleIds = [];
  for (const [n, amt, typ] of rules) {
    const r = await client.query(
      `INSERT INTO penalty_rules (name, amount_pkr, type, is_active, created_by) VALUES ($1,$2,$3,true,$4) RETURNING id`,
      [n, amt, typ, hrUid]
    );
    ruleIds.push(r.rows[0].id);
  }

  const penRows = [];
  for (let k = 0; k < 150; k++) {
    const rng = mulberry32(k * 54321);
    const empId = padEmp(1 + Math.floor(rng() * 520));
    const ruleId = ruleIds[Math.floor(rng() * ruleIds.length)];
    const st = rng() < 0.7 ? 'approved' : rng() < 0.9 ? 'pending' : 'rejected';
    const dt = `201${Math.floor(rng() * 9)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-15`;
    const reviewed = st !== 'pending' ? hrUid : null;
    const reviewedAt = reviewed ? `${dt} 15:00:00+00` : null;
    penRows.push([
      empId,
      ruleId,
      dt,
      'Policy breach — documented',
      st,
      hrExecUid,
      null,
      reviewed,
      reviewedAt,
      'Processed per HR policy',
      st === 'approved',
      st === 'approved' ? `${dt} 16:00:00+00` : null,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO employee_penalties (employee_id, rule_id, date, reason, status, proposed_by, submitted_to_ho_at, reviewed_by, reviewed_at, review_note, employee_ack, employee_acked_at)`,
    [
      'employee_id',
      'rule_id',
      'date',
      'reason',
      'status',
      'proposed_by',
      'submitted_to_ho_at',
      'reviewed_by',
      'reviewed_at',
      'review_note',
      'employee_ack',
      'employee_acked_at',
    ],
    penRows
  );

  const evRows = [];
  for (let y = 2020; y <= 2026; y++) {
    evRows.push(['holiday', `${y}-03-23`, `Pakistan Day ${y}`, 'all', hrUid, null]);
    evRows.push(['holiday', `${y}-08-14`, `Independence Day ${y}`, 'all', hrUid, null]);
    evRows.push(['event', `${y}-12-15`, `Annual Performance Review ${y}`, 'hr', hrUid, null]);
  }
  await batchInsert(
    client,
    `INSERT INTO calendar_events (type, date, title, visibility, created_by, updated_by)`,
    ['type', 'date', 'title', 'visibility', 'created_by', 'updated_by'],
    evRows
  );

  const notifRows = [];
  for (let k = 0; k < 200; k++) {
    const rng = mulberry32(k * 77777);
    const userScoped = rng() < 0.45;
    notifRows.push([
      userScoped ? uidByEmp[padEmp(1 + Math.floor(rng() * 50))] : null,
      userScoped ? null : 'employee',
      ['leave_update', 'attendance_alert', 'system', 'announcement', 'penalty'][Math.floor(rng() * 5)],
      'ESSPL announcement',
      rng() < 0.6,
      hrUid,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO notifications (user_id, role, type, message, is_read, created_by)`,
    ['user_id', 'role', 'type', 'message', 'is_read', 'created_by'],
    notifRows
  );

  const uaRows = [];
  for (let k = 0; k < 80; k++) {
    const rng = mulberry32(k * 22222);
    const open = rng() < 0.5;
    const empId = padEmp(1 + Math.floor(rng() * 520));
    const exp = open
      ? `2026-0${1 + Math.floor(rng() * 4)}-${String(10 + Math.floor(rng() * 18)).padStart(2, '0')}`
      : `2024-06-01`;
    uaRows.push([
      empId,
      ['probation_end', 'contract_expiry', 'medical_exam_due', 'cnic_expiry'][Math.floor(rng() * 4)],
      exp,
      open ? 'open' : 'resolved',
      hrUid,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO urgent_alerts (employee_id, type, expiry_date, status, updated_by)`,
    ['employee_id', 'type', 'expiry_date', 'status', 'updated_by'],
    uaRows
  );

  const paRows = [];
  for (let k = 0; k < 100; k++) {
    const rng = mulberry32(k * 33333);
    const open = rng() < 0.4;
    paRows.push([
      padEmp(1 + Math.floor(rng() * 520)),
      JSON.stringify(['bank_account', 'emergency_contact']),
      open ? 'open' : 'resolved',
      open ? null : hrExecUid,
      open ? null : '2025-01-01T00:00:00.000Z',
    ]);
  }
  for (const row of paRows) {
    await client.query(
      `INSERT INTO pending_actions (employee_id, missing_fields, status, resolved_by, resolved_at) VALUES ($1, $2::jsonb, $3, $4, $5)`,
      row
    );
  }

  const dirRows = [];
  for (let i = 1; i <= 520; i++) {
    const ji = jobRows[i - 1];
    const rng = mulberry32(i * 666);
    dirRows.push([
      padEmp(i),
      empRows[i - 1][1],
      userMeta[i - 1].email,
      `ext-${100 + i}`,
      ecRows[i - 1][7],
      i <= 35 || rng() < 0.06,
      titleByDesigId[ji[2]],
      ji[1],
      ji[6],
      rng() < 0.7 ? 'available' : rng() < 0.9 ? 'busy' : 'out_of_office',
      hrUid,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO directory_entries (employee_id, name, email, phone_internal, phone_mobile, phone_mobile_public, role_title, department_id, branch_id, availability, created_by)`,
    [
      'employee_id',
      'name',
      'email',
      'phone_internal',
      'phone_mobile',
      'phone_mobile_public',
      'role_title',
      'department_id',
      'branch_id',
      'availability',
      'created_by',
    ],
    dirRows
  );

  const actRows = [];
  for (let k = 0; k < 300; k++) {
    const rng = mulberry32(k * 99991);
    actRows.push([
      uidByEmp[padEmp(1 + Math.floor(rng() * 20))],
      ['USER_LOGIN', 'EMPLOYEE_UPDATED', 'LEAVE_APPROVED', 'ATTENDANCE_LOCKED'][Math.floor(rng() * 4)],
      ['user', 'employee_info', 'leave_requests', 'attendance'][Math.floor(rng() * 4)],
      String(Math.floor(rng() * 1e9)),
      { ip: '192.168.1.12', browser: 'Chrome' },
      `202${Math.floor(rng() * 7)}-${String(1 + Math.floor(rng() * 11)).padStart(2, '0')}-01 10:00:00+00`,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, meta, created_at)`,
    ['user_id', 'action', 'entity_type', 'entity_id', 'meta', 'created_at'],
    actRows
  );

  const audRows = [];
  for (let k = 0; k < 200; k++) {
    const rng = mulberry32(k * 42424);
    audRows.push([
      uidByEmp[padEmp(1 + Math.floor(rng() * 15))],
      ['INSERT', 'UPDATE', 'DELETE'][Math.floor(rng() * 3)],
      ['employee_info', 'employee_salary', 'leave_requests'][Math.floor(rng() * 3)],
      uidByEmp[padEmp(50)],
      'Salary revised for annual increment',
      `202${Math.floor(rng() * 7)}-06-01 09:00:00+00`,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO audit_logs (user_id, action, table_name, record_id, reason, created_at)`,
    ['user_id', 'action', 'table_name', 'record_id', 'reason', 'created_at'],
    audRows
  );

  const vendors = [
    'Hikvision Pakistan',
    'Dahua Pakistan',
    'CP Plus Distributor - Karachi',
    'Cisco Reseller Pak',
    'MikroTik Pakistan',
    'Genetec Pakistan',
    'Axis Communications',
    'Bosch Security Pakistan',
    'Honeywell Distributor',
    'Pelco Pakistan',
    'TP-Link Pakistan',
    'D-Link Pakistan',
    'ZKTeco Pakistan',
    'Suprema Biometrics Pakistan',
    'Hanwha Vision Pakistan',
    'Ezviz Pakistan',
    'Uniview Pakistan',
    'IC Realtime Pakistan',
    'Milestone Systems',
    'Seagate Storage Solutions',
  ];
  const vid = [];
  for (const vn of vendors) {
    const r = await client.query(
      `INSERT INTO vendors (vendor_name, contact_person, phone, email) VALUES ($1,$2,$3,$4) RETURNING id`,
      [vn, 'Sales Desk', '0300-1234567', 'sales@vendor.pk']
    );
    vid.push(r.rows[0].id);
  }

  const custRows = [];
  const custNames = [
    ['Karachi Port Trust', 'KPT', 'Government'],
    ['Pakistan Steel Mills', 'PSM', 'Government'],
    ['Lucky Cement', 'Lucky', 'Corporate'],
    ['Engro Corporation', 'Engro', 'Corporate'],
    ['PSO Head Office', 'PSO', 'Corporate'],
    ['Habib Bank Limited', 'HBL', 'Corporate'],
    ['National Bank HO', 'NBP', 'Corporate'],
    ['K-Electric', 'KE', 'Corporate'],
    ['PTCL', 'PTCL', 'Corporate'],
    ['Wateen Telecom', 'Wateen', 'Corporate'],
    ['DHA Karachi', 'DHA', 'Government'],
    ['Bahria Town Projects', 'Bahria', 'Corporate'],
    ['Gulshan-e-Hadeed', 'GSH', 'SME'],
    ['Ahmed Traders', 'Ahmed Traders', 'Individual'],
    ['Fatima Enterprises', 'Fatima Ent', 'SME'],
    ['Ali Securities', 'Ali Sec', 'Corporate'],
    ['Noor Developers', 'Noor Dev', 'SME'],
    ['Zain Logistics', 'Zain Log', 'Corporate'],
    ['Sana Retail Mart', 'Sana Mart', 'Individual'],
    ['Usman Farms', 'Usman', 'Individual'],
    ['Haris Construction', 'Haris Con', 'SME'],
    ['Zainab Textiles', 'Zainab Tex', 'Corporate'],
    ['Omar Pharma', 'Omar Pharma', 'Corporate'],
    ['Raza Motors', 'Raza Mot', 'SME'],
    ['Siddiqui Legal', 'Siddiqui', 'Individual'],
    ['Aslam Hotels', 'Aslam Hot', 'Corporate'],
    ['Imran Foods', 'Imran Food', 'SME'],
    ['Yasir Glass', 'Yasir Glass', 'Individual'],
    ['Shahzad Steel', 'Shahzad St', 'Corporate'],
    ['Waqas Marine', 'Waqas Mar', 'Corporate'],
    ['Farhan Aviation', 'Farhan Av', 'Corporate'],
  ];
  for (const [cn, comp, typ] of custNames) {
    custRows.push([cn, comp, typ, '0300-1112223', `info@${comp.replace(/\s+/g, '').toLowerCase()}.pk`]);
  }
  await batchInsert(
    client,
    `INSERT INTO customers (customer_name, company_name, customer_type, phone, email)`,
    ['customer_name', 'company_name', 'customer_type', 'phone', 'email'],
    custRows
  );
  const custIds = (await client.query(`SELECT id FROM customers ORDER BY created_at`)).rows.map((r) => r.id);

  const procUid = uidByEmp[padEmp(88)] ?? hrUid;
  const prRows = [];
  for (let k = 0; k < 25; k++) {
    const rng = mulberry32(k * 31313);
    const st = rng() < 0.7 ? 'APPROVED' : rng() < 0.85 ? 'PENDING' : 'REJECTED';
    const dep = deptIds[Math.floor(rng() * deptIds.length)];
    prRows.push([
      procUid,
      dep,
      st,
      st === 'APPROVED' ? hrUid : null,
      st === 'APPROVED' ? '2018-06-01' : null,
      st === 'REJECTED' ? 'Budget constraints' : null,
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO purchase_requests (requested_by, department_id, status, approved_by, approved_at, approval_remarks)`,
    ['requested_by', 'department_id', 'status', 'approved_by', 'approved_at', 'approval_remarks'],
    prRows
  );
  const prIds = (await client.query(`SELECT id, status FROM purchase_requests ORDER BY created_at`)).rows;

  const priRows = [];
  for (let i = 0; i < prIds.length; i++) {
    const rng = mulberry32(i * 91919);
    const nItems = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < nItems; j++) {
      const pk = productKeys[Math.floor(rng() * productKeys.length)];
      priRows.push([prIds[i].id, PROD[pk], pk, 1 + Math.floor(rng() * 10), 'PR line']);
    }
  }
  await batchInsert(
    client,
    `INSERT INTO purchase_request_items (purchase_request_id, product_id, product_name, quantity, remarks)`,
    ['purchase_request_id', 'product_id', 'product_name', 'quantity', 'remarks'],
    priRows
  );

  const poInserted = [];
  for (const pr of prIds) {
    if (pr.status !== 'APPROVED') continue;
    const rng = mulberry32(pr.id.charCodeAt(0) * 999);
    const r = await client.query(
      `INSERT INTO purchase_orders (pr_id, vendor_id, created_by, total_amount) VALUES ($1,$2,$3,$4) RETURNING id`,
      [pr.id, vid[Math.floor(rng() * vid.length)], procUid, 100000 + Math.floor(rng() * 400000)]
    );
    poInserted.push({ poId: r.rows[0].id, prId: pr.id });
  }

  const poiRows = [];
  for (const po of poInserted) {
    const items = await client.query(`SELECT product_id, product_name, quantity FROM purchase_request_items WHERE purchase_request_id = $1`, [
      po.prId,
    ]);
    let line = 1;
    for (const it of items.rows) {
      poiRows.push([po.poId, it.product_id, it.product_name, it.quantity, 4000 + line * 250]);
      line++;
    }
  }
  await batchInsert(
    client,
    `INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_price)`,
    ['purchase_order_id', 'product_id', 'product_name', 'quantity', 'unit_price'],
    poiRows
  );

  const grnInserted = [];
  for (const po of poInserted) {
    const r = await client.query(`INSERT INTO grns (po_id, received_by) VALUES ($1,$2) RETURNING id`, [po.poId, procUid]);
    grnInserted.push({ grnId: r.rows[0].id, poId: po.poId });
  }

  const griRows = [];
  for (const g of grnInserted) {
    const items = await client.query(`SELECT product_id, product_name, quantity FROM purchase_order_items WHERE purchase_order_id = $1`, [g.poId]);
    for (const it of items.rows) {
      const recv = Math.max(0, it.quantity - (Math.random() < 0.08 ? 1 : 0));
      if (recv > 0) griRows.push([g.grnId, it.product_id, it.product_name, recv, 'Received']);
    }
  }
  await batchInsert(
    client,
    `INSERT INTO grn_items (grn_id, product_id, product_name, quantity_received, remarks)`,
    ['grn_id', 'product_id', 'product_name', 'quantity_received', 'remarks'],
    griRows
  );

  const assetKeys = productKeys.slice(0, 40);
  const invItems = [];
  const statuses = ['AVAILABLE', 'ALLOCATED', 'INSTALLED', 'RETURNED', 'DAMAGED'];
  const weights = [0.5, 0.3, 0.15, 0.03, 0.02];
  for (let i = 0; i < 200; i++) {
    const rng = mulberry32(i * 60606);
    const pk = assetKeys[Math.floor(rng() * assetKeys.length)];
    let st = statuses[0];
    const u = rng();
    let cum = 0;
    for (let s = 0; s < weights.length; s++) {
      cum += weights[s];
      if (u < cum) {
        st = statuses[s];
        break;
      }
    }
    invItems.push([PROD[pk], `SN-HIK-2024-${String(i + 1).padStart(5, '0')}`, st]);
  }
  await batchInsert(
    client,
    `INSERT INTO inventory_items (product_id, serial_number, current_status)`,
    ['product_id', 'serial_number', 'current_status'],
    invItems
  );
  const invIds = (await client.query(`SELECT id FROM inventory_items ORDER BY created_at`)).rows.map((r) => r.id);

  const movRows = [];
  for (let k = 0; k < 400; k++) {
    const rng = mulberry32(k * 50505);
    movRows.push([
      invIds[Math.floor(rng() * invIds.length)],
      ['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'RETURN'][Math.floor(rng() * 4)],
      ['GRN', 'DELIVERY_ORDER', 'TRANSFER_REQUEST'][Math.floor(rng() * 3)],
      procUid,
      'Inventory movement',
    ]);
  }
  await batchInsert(
    client,
    `INSERT INTO inventory_movements (inventory_item_id, movement_type, reference_type, moved_by, remarks)`,
    ['inventory_item_id', 'movement_type', 'reference_type', 'moved_by', 'remarks'],
    movRows
  );

  const quoData = [];
  for (let k = 0; k < 20; k++) {
    const rng = mulberry32(k * 41414);
    const st = rng() < 0.6 ? 'APPROVED' : rng() < 0.85 ? 'DRAFT' : 'REJECTED';
    quoData.push({
      cust: custIds[Math.floor(rng() * custIds.length)],
      st,
      total: 250000 + Math.floor(rng() * 2e6),
    });
  }
  const quoIds = [];
  for (const q of quoData) {
    const r = await client.query(
      `
      INSERT INTO quotations (customer_id, status, created_by, approved_by, approved_at, approval_remarks, total_amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `,
      [
        q.cust,
        q.st,
        hrUid,
        q.st === 'APPROVED' ? hrUid : null,
        q.st === 'APPROVED' ? '2024-06-01' : null,
        q.st === 'REJECTED' ? 'Pricing not competitive' : null,
        q.total,
      ]
    );
    quoIds.push({ id: r.rows[0].id, st: q.st, total: q.total });
  }

  const quiRows = [];
  for (let i = 0; i < quoIds.length; i++) {
    const rng = mulberry32(i * 71717);
    const n = 2 + Math.floor(rng() * 4);
    for (let j = 0; j < n; j++) {
      const pk = productKeys[Math.floor(rng() * productKeys.length)];
      quiRows.push([quoIds[i].id, 1 + Math.floor(rng() * 5), 10000 + j * 5000, PROD[pk]]);
    }
  }
  await batchInsert(
    client,
    `INSERT INTO quotation_items (quotation_id, quantity, unit_price, product_id)`,
    ['quotation_id', 'quantity', 'unit_price', 'product_id'],
    quiRows
  );

  const doIns = [];
  for (let k = 0; k < 15; k++) {
    const rng = mulberry32(k * 16161);
    const st = rng() < 0.7 ? 'APPROVED' : rng() < 0.85 ? 'PENDING' : 'REJECTED';
    const toEmp = rng() < 0.5;
    const issuedToType = toEmp ? 'EMPLOYEE' : 'CUSTOMER';
    const issuedToId = toEmp ? uidByEmp[padEmp(10 + k)] : custIds[k % custIds.length];
    const qref = quoIds[k % quoIds.length];
    const r = await client.query(
      `
      INSERT INTO delivery_orders (issued_to_type, issued_to_id, issued_by, approved_by, approved_at, approval_remarks, status, quotation_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `,
      [
        issuedToType,
        issuedToId,
        hrUid,
        st === 'APPROVED' ? hrUid : null,
        st === 'APPROVED' ? '2025-03-01' : null,
        'Issued',
        st,
        qref.id,
      ]
    );
    doIns.push(r.rows[0].id);
  }

  const doiRows = [];
  for (let i = 0; i < doIns.length; i++) {
    const rng = mulberry32(i * 27272);
    for (let j = 0; j < 2 + Math.floor(rng() * 3); j++) {
      const pk = productKeys[Math.floor(rng() * productKeys.length)];
      doiRows.push([doIns[i], pk, 1 + Math.floor(rng() * 4), 'DO line', PROD[pk]]);
    }
  }
  await batchInsert(
    client,
    `INSERT INTO delivery_order_items (delivery_order_id, product_name, quantity, remarks, product_id)`,
    ['delivery_order_id', 'product_name', 'quantity', 'remarks', 'product_id'],
    doiRows
  );

  for (const q of quoIds) {
    if (q.st !== 'APPROVED') continue;
    const rng = mulberry32(q.id.charCodeAt(0) * 7);
    await client.query(
      `
      INSERT INTO invoices (quotation_id, created_by, total_amount, approved_by, approved_at, payment_status, remarks, approval_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
      [
        q.id,
        hrUid,
        q.total,
        hrUid,
        '2024-07-01',
        rng() < 0.7 ? 'PAID' : 'UNPAID',
        'Project invoice',
        'APPROVED',
      ]
    );
  }
  const invoices = await client.query(`SELECT id, quotation_id FROM invoices`);
  for (const inv of invoices.rows) {
    const items = await client.query(`SELECT product_id, quantity, unit_price FROM quotation_items WHERE quotation_id = $1`, [inv.quotation_id]);
    for (const it of items.rows) {
      await client.query(`INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)`, [
        inv.id,
        it.product_id,
        it.quantity,
        it.unit_price,
      ]);
    }
  }

  const shiftNameById = {};
  for (const [name, id] of Object.entries(SH)) shiftNameById[id] = name;
  const shiftTimes = {
    'Morning Shift': { start: 8, end: 17 },
    'Evening Shift': { start: 14, end: 22 },
    'Night Shift': { start: 22, end: 6 },
    'Field Shift': { start: 9, end: 18 },
    'Flexible Shift': { start: 10, end: 19 },
  };

  const allBiz = getWeekdaysBetween('2024-01-01', TODAY, holidaySet);
  const sampleDates = (empIdx) => {
    const out = [];
    const step = Math.max(1, Math.floor(allBiz.length / 86));
    for (let i = 0; i < 86 && i * step + (empIdx % 5) < allBiz.length; i++) {
      out.push(allBiz[(i * step + empIdx * 3) % allBiz.length]);
    }
    return out;
  };

  const attRows = [];
  for (let i = 1; i <= 520; i++) {
    if (i >= 400 && i < 440) continue;
    const empId = padEmp(i);
    const ji = jobRows[i - 1];
    const shiftId = ji[7];
    const sname = shiftNameById[shiftId] || 'Morning Shift';
    const stCfg = shiftTimes[sname] || shiftTimes['Morning Shift'];
    const dates = sampleDates(i);
    const rng = mulberry32(i * 12121);
    for (const dt of dates) {
      const diff = (new Date(TODAY) - new Date(dt + 'Z')) / 86400000;
      let state = 'saved';
      if (diff > 60) state = 'locked';
      else if (diff > 30) state = 'submitted';
      else if (rng() < 0.25) state = 'draft';

      let status = 'present';
      const r2 = rng();
      if (r2 < 0.78) status = 'present';
      else if (r2 < 0.86) status = 'late';
      else if (r2 < 0.91) status = 'half_day';
      else if (r2 < 0.96) status = 'absent';
      else if (r2 < 0.99) status = 'on_leave';
      else status = 'holiday';

      let cin = null;
      let cout = null;
      if (['present', 'late', 'half_day'].includes(status)) {
        const lateMin = status === 'late' ? 20 + Math.floor(rng() * 70) : 0;
        cin = `${String(stCfg.start + Math.floor(lateMin / 60)).padStart(2, '0')}:${String(lateMin % 60).padStart(2, '0')}:00`;
        const outH = status === 'half_day' ? stCfg.start + 4 : stCfg.end;
        cout = `${String(outH % 24).padStart(2, '0')}:15:00`;
      }

      const ack = state === 'locked';
      let subBy = null;
      let subAt = null;
      if (state === 'submitted' || state === 'locked') {
        subBy = hrUid;
        subAt = `${dt} 18:00:00+00`;
      }

      attRows.push([empId, shiftId, dt, cin, cout, status, status !== 'present' ? 'Operational note' : null, hrExecUid, ack, state, subBy, subAt]);
    }
  }

  await batchInsert(
    client,
    `INSERT INTO attendance (employee_id, shift_id, date, check_in, check_out, status, notes, marked_by, ack, state, submitted_by, submitted_at)`,
    ['employee_id', 'shift_id', 'date', 'check_in', 'check_out', 'status', 'notes', 'marked_by', 'ack', 'state', 'submitted_by', 'submitted_at'],
    attRows,
    500
  );
  console.log(`  attendance ${attRows.length} rows`);

  const unlockSample = await client.query(
    `SELECT id FROM attendance WHERE state = 'locked' ORDER BY random() LIMIT 40`
  );
  for (const row of unlockSample.rows) {
    await client.query(
      `UPDATE attendance SET state = 'ho_unlocked', unlocked_by = $1, unlock_reason = $2, unlocked_at = $3 WHERE id = $4`,
      [hrUid, 'HO correction approved', '2026-04-01 10:00:00+00', row.id]
    );
  }
}
