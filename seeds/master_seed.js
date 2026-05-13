/**
 * ESSPL ERP — master_seed.js
 *
 * Covers FK-safe seeding for Electronic Safety & Security Pvt. Ltd (ESSPL),
 * operational window 1990-01-01 .. 2026-05-12.
 *
 * Employee IDs match backend generator: EMP001 … EMP520 (see employees.service.js).
 *
 * Usage:
 *   node seeds/master_seed.js
 *
 * Env:
 *   DATABASE_URL — required (see .env.example)
 *   PORT — default 3001 (used only when SEED_USE_API=1)
 *   SEED_USE_API=1 — optional smoke test: POST /api/auth/login then GET /api/config/departments
 *
 * Primary seed path is PostgreSQL pool (reliable for ~45k+ attendance rows).
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { seedEmployeesAndHR } from './master_seed_extend.js';

const END_DATE = new Date('2026-05-12T00:00:00Z');
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Deduped permission keys from scripts/seed-permissions.js, routes, migrations, dev_seed-style inventory keys */
const PERMISSION_KEYS = [
  ['config:read', 'Read system configuration'],
  ['config:write', 'Write system configuration (includes POST /api/config/:entity)'],
  ['config:manage', 'Legacy alias — kept for parity with older seeds'],
  ['employees:read', 'View employee records'],
  ['employees:write', 'Create / update employees'],
  ['salary:read', 'Read salary'],
  ['salary:write', 'Salary revisions'],
  ['allowances:read', 'Read allowances'],
  ['allowances:write', 'Manage allowances'],
  ['leave:read', 'Read leave'],
  ['leave:write', 'Submit leave'],
  ['leave:approve', 'Approve leave'],
  ['leave_capacity:read', 'Read leave capacity'],
  ['leave_capacity:write', 'Manage leave capacity'],
  ['attendance:read', 'Read attendance'],
  ['attendance:write', 'Write attendance'],
  ['attendance:submit_ho', 'Submit attendance to HO'],
  ['attendance:unlock', 'Unlock attendance'],
  ['calendar:read', 'Read calendar'],
  ['calendar:write', 'Write calendar'],
  ['notifications:read', 'Read notifications'],
  ['notifications:write', 'Create notifications'],
  ['alerts:read', 'Urgent alerts'],
  ['pending_actions:read', 'Pending actions'],
  ['dashboard:read', 'Dashboard'],
  ['directory:read', 'Directory read'],
  ['directory:write', 'Directory write'],
  ['inventory:read', 'Inventory read'],
  ['inventory:write', 'Inventory write'],
  ['purchasing:read', 'Purchasing read'],
  ['purchasing:write', 'Purchasing write'],
  ['purchasing:approve', 'Purchasing approve'],
  ['hr:full_access', 'HR full access placeholder'],
  ['payroll:read', 'Payroll read placeholder'],
  ['payroll:write', 'Payroll write placeholder'],
  ['penalty_rules:write', 'Penalty rules CRUD'],
  ['penalties:propose', 'Propose penalties'],
  ['penalties:review', 'Review penalties'],
  ['penalties:read_own', 'Own penalties'],
  ['penalties:read_all', 'All penalties'],
  ['reports:read', 'Reports'],
];

async function hashPassword(pw, rounds = 12) {
  return bcrypt.hash(pw, rounds);
}

async function truncateAll(client) {
  await client.query(`
    TRUNCATE TABLE
      activity_logs,
      audit_logs,
      invoice_items,
      invoices,
      quotation_items,
      quotations,
      delivery_order_items,
      delivery_orders,
      inventory_movements,
      inventory_items,
      grn_items,
      grns,
      purchase_order_items,
      purchase_orders,
      purchase_request_items,
      purchase_requests,
      customers,
      vendors,
      products,
      item_categories,
      employee_allowances,
      employee_salary,
      allowance_types,
      employee_penalties,
      penalty_rules,
      leave_requests,
      leave_balances,
      leave_policies,
      leave_capacity_config,
      attendance,
      notifications,
      calendar_events,
      pending_actions,
      urgent_alerts,
      directory_entries,
      users,
      employee_job_history,
      job_info,
      emergency_contacts,
      employee_bank_accounts,
      employee_medical,
      employee_info,
      role_permissions,
      roles,
      permissions,
      leave_types,
      shifts,
      work_locations,
      work_modes,
      job_statuses,
      employment_types,
      designations,
      departments
    RESTART IDENTITY CASCADE
  `);

  const seqs = [
    'customer_seq',
    'vendor_seq',
    'pr_seq',
    'po_seq',
    'grn_seq',
    'quotation_seq',
    'invoice_seq',
    'do_seq',
    'pay_seq',
  ];
  for (const s of seqs) {
    try {
      await client.query(`SELECT setval('public.${s}', 1, false)`);
    } catch {
      /* ignore if sequence renamed */
    }
  }
}

async function bootstrapPermissions(client) {
  const keys = PERMISSION_KEYS.map(([k]) => k);
  const desc = PERMISSION_KEYS.map(([, d]) => d);
  await client.query(
    `
    INSERT INTO permissions (permission_key, description)
    SELECT k, d FROM unnest($1::text[], $2::text[]) AS t(k, d)
    ON CONFLICT (permission_key) DO NOTHING
  `,
    [keys, desc]
  );
}

async function bootstrapVerify(client) {
  const r = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM permissions) AS perm_count,
      (SELECT COUNT(*)::int FROM roles) AS role_count,
      (SELECT COUNT(*)::int FROM role_permissions) AS rp_count,
      (SELECT COUNT(*)::int FROM users WHERE email = 'superadmin@esspl.com.pk') AS admin_exists
  `);
  const row = r.rows[0];
  console.log(
    `  Bootstrap check — permissions: ${row.perm_count}, roles: ${row.role_count}, role_permissions: ${row.rp_count}, admin user: ${row.admin_exists}`
  );
  if (row.perm_count === 0) throw new Error('BOOTSTRAP FAILED: no permissions');
  if (row.role_count === 0) throw new Error('BOOTSTRAP FAILED: no roles');
  if (row.rp_count === 0) throw new Error('BOOTSTRAP FAILED: no role_permissions');
  if (row.admin_exists === 0) throw new Error('BOOTSTRAP FAILED: super_admin missing');
}

/** Optional HTTP smoke test — requires server running */
async function seedViaAPI() {
  if (process.env.SEED_USE_API !== '1') {
    console.log('  (Skipping HTTP API smoke test — set SEED_USE_API=1 with server running)');
    return;
  }
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@esspl.com.pk', password: 'SuperAdmin@123!' }),
  });
  if (!loginRes.ok) {
    console.error('  API login failed:', await loginRes.text());
    return;
  }
  const body = await loginRes.json();
  const token = body.data?.token;
  if (!token) {
    console.error('  No token in login response');
    return;
  }
  const hdr = { Authorization: `Bearer ${token}` };
  const deptRes = await fetch(`${BASE_URL}/api/config/departments`, { headers: hdr });
  console.log(`  API smoke test: GET /api/config/departments → ${deptRes.status}`);
}

async function seedViaPool(client) {
  await client.query('ALTER TABLE roles ALTER COLUMN department_id DROP NOT NULL');
  await bootstrapPermissions(client);

  const permRes = await client.query(`SELECT id, permission_key FROM permissions`);
  const PERM = Object.fromEntries(permRes.rows.map((r) => [r.permission_key, r.id]));

  const roleIds = {};

  async function wireRole(roleName, keys) {
    const rid = roleIds[roleName];
    if (!rid) return;
    const ids = keys.map((k) => PERM[k]).filter(Boolean);
    if (ids.length === 0) return;
    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1::uuid, x::uuid FROM unnest($2::uuid[]) AS t(x)
      ON CONFLICT DO NOTHING
    `,
      [rid, ids]
    );
  }

  // ── Departments (tree) ───────────────────────────────────────────────────
  const insDept = async (code, name, parentId = null) => {
    const r = await client.query(
      `
      INSERT INTO departments (department_code, department_name, parent_department_id, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id
    `,
      [code, name, parentId]
    );
    return r.rows[0].id;
  };

  const D = {};
  D.it = await insDept('DEPT-IT', 'IT');
  D.itSup = await insDept('DEPT-IT-SUP', 'IT-Support', D.it);
  D.itDev = await insDept('DEPT-IT-DEV', 'IT-Development', D.it);
  D.swe = await insDept('DEPT-SWE', 'Software Engineering');
  D.sweFe = await insDept('DEPT-SWE-FE', 'Frontend', D.swe);
  D.sweBe = await insDept('DEPT-SWE-BE', 'Backend', D.swe);
  D.sweMob = await insDept('DEPT-SWE-MOB', 'Mobile', D.swe);
  D.sweQa = await insDept('DEPT-SWE-QA', 'QA', D.swe);
  D.sweDevOps = await insDept('DEPT-SWE-DEVOPS', 'DevOps', D.swe);
  D.hr = await insDept('DEPT-HR', 'HR');
  D.sales = await insDept('DEPT-SALES', 'Sales');
  D.salesKhi = await insDept('DEPT-SALES-KHI', 'Sales-Karachi', D.sales);
  D.salesLhr = await insDept('DEPT-SALES-LHR', 'Sales-Lahore', D.sales);
  D.salesIsb = await insDept('DEPT-SALES-ISB', 'Sales-Islamabad', D.sales);
  D.proc = await insDept('DEPT-PROC', 'Procurement');
  D.fin = await insDept('DEPT-FIN', 'Finance');
  D.ops = await insDept('DEPT-OPS', 'Operations');
  D.opsFe = await insDept('DEPT-OPS-FE', 'Field-Engineering', D.ops);
  D.opsInst = await insDept('DEPT-OPS-INST', 'Installations', D.ops);
  D.cs = await insDept('DEPT-CS', 'Customer-Support');
  D.adm = await insDept('DEPT-ADM', 'Administration');
  console.log('  Departments seeded');

  // ── Designations ──────────────────────────────────────────────────────────
  const designationTitles = [
    'CEO',
    'COO',
    'CFO',
    'CTO',
    'General Manager',
    'Deputy General Manager',
    'HR Manager',
    'HR Executive',
    'HR Officer',
    'HR Intern',
    'IT Manager',
    'IT Support Engineer',
    'Network Engineer',
    'System Administrator',
    'Software Engineering Manager',
    'Tech Lead',
    'Principal Engineer',
    'Senior Software Engineer',
    'Software Engineer',
    'Junior Software Engineer',
    'Associate Developer',
    'Frontend Developer',
    'Senior Frontend Developer',
    'Backend Developer',
    'Senior Backend Developer',
    'Mobile Developer',
    'Senior Mobile Developer',
    'DevOps Engineer',
    'Senior DevOps Engineer',
    'QA Engineer',
    'Senior QA Engineer',
    'QA Lead',
    'UI/UX Designer',
    'Sales Manager',
    'Senior Sales Executive',
    'Sales Executive',
    'Sales Intern',
    'Procurement Manager',
    'Procurement Officer',
    'Finance Manager',
    'Finance Officer',
    'Accountant',
    'Operations Manager',
    'Field Engineer',
    'Installation Technician',
    'Team Lead',
    'Customer Support Manager',
    'Support Executive',
  ];

  const DES = {};
  for (const t of designationTitles) {
    const r = await client.query(
      `INSERT INTO designations (title, is_active) VALUES ($1, true) ON CONFLICT (title) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
      [t]
    );
    DES[t] = r.rows[0].id;
  }
  console.log(`  Designations seeded (${designationTitles.length})`);

  // ── Employment types, job statuses, work modes, locations, shifts ────────
  const empTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Probationary'];
  const ET = {};
  for (const n of empTypes) {
    const r = await client.query(
      `INSERT INTO employment_types (type_name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    ET[n] = r.rows[0].id;
  }

  const jobStatuses = ['Active', 'Probation', 'On Leave', 'Suspended', 'Terminated', 'Resigned'];
  const JS = {};
  for (const n of jobStatuses) {
    const r = await client.query(
      `INSERT INTO job_statuses (status_name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    JS[n] = r.rows[0].id;
  }

  const workModes = ['On-Site', 'Remote', 'Hybrid', 'Field'];
  const WM = {};
  for (const n of workModes) {
    const r = await client.query(
      `INSERT INTO work_modes (mode_name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    WM[n] = r.rows[0].id;
  }

  const workLocs = [
    'Head Office - Karachi',
    'Branch Office - Lahore',
    'Branch Office - Islamabad',
    'Warehouse - Karachi',
    'Client Site - Karachi',
    'Client Site - Lahore',
  ];
  const WL = {};
  for (const n of workLocs) {
    const r = await client.query(
      `INSERT INTO work_locations (location_name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    WL[n] = r.rows[0].id;
  }

  const shiftsDef = [
    { name: 'Morning Shift', start: '08:00:00', end: '17:00:00', late: 15 },
    { name: 'Evening Shift', start: '14:00:00', end: '22:00:00', late: 15 },
    { name: 'Night Shift', start: '22:00:00', end: '06:00:00', late: 20 },
    { name: 'Field Shift', start: '09:00:00', end: '18:00:00', late: 30 },
    { name: 'Flexible Shift', start: '10:00:00', end: '19:00:00', late: 30 },
  ];
  const SH = {};
  for (const s of shiftsDef) {
    const r = await client.query(
      `
      INSERT INTO shifts (name, start_time, end_time, late_after_minutes, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id
    `,
      [s.name, s.start, s.end, s.late]
    );
    SH[s.name] = r.rows[0].id;
  }

  console.log('  Lookup tables (employment, job status, work modes, locations, shifts) seeded');

  // ── Roles ────────────────────────────────────────────────────────────────
  const superPass = await hashPassword('SuperAdmin@123!');
  const hrMgrPass = await hashPassword('HrManager@123!');
  const stdPass = await hashPassword('Esspl@2024!');

  const insertRole = async (name, desc, deptId) => {
    const r = await client.query(
      `
      INSERT INTO roles (department_id, role_name, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
      [deptId, name, desc]
    );
    roleIds[name] = r.rows[0].id;
    return r.rows[0].id;
  };

  await insertRole('super_admin', 'Full access', null);
  await insertRole('hr_manager', 'HR Manager', D.hr);
  await insertRole('hr_executive', 'HR Executive', D.hr);
  await insertRole('it_manager', 'IT Manager', D.it);
  await insertRole('swe_manager', 'Software Engineering Manager', D.swe);
  await insertRole('tech_lead', 'Technical Lead', D.swe);
  await insertRole('sales_manager', 'Sales Manager', D.sales);
  await insertRole('procurement_manager', 'Procurement Manager', D.proc);
  await insertRole('finance_manager', 'Finance Manager', D.fin);
  await insertRole('operations_manager', 'Operations Manager', D.ops);
  await insertRole('employee', 'Standard employee', null);

  const superAdminRoleId = roleIds.super_admin;
  const hrManagerRoleId = roleIds.hr_manager;
  const hrExecRoleId = roleIds.hr_executive;
  const employeeRoleId = roleIds.employee;

  const allPermIds = Object.values(PERM);
  await client.query(
    `
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT $1::uuid, id FROM permissions
    ON CONFLICT DO NOTHING
  `,
    [superAdminRoleId]
  );

  await wireRole('hr_manager', [
    'config:read',
    'config:write',
    'employees:read',
    'employees:write',
    'salary:read',
    'salary:write',
    'allowances:read',
    'allowances:write',
    'leave:read',
    'leave:write',
    'leave:approve',
    'leave_capacity:read',
    'leave_capacity:write',
    'attendance:read',
    'attendance:write',
    'attendance:submit_ho',
    'calendar:read',
    'calendar:write',
    'notifications:read',
    'notifications:write',
    'alerts:read',
    'pending_actions:read',
    'dashboard:read',
    'directory:read',
    'directory:write',
    'penalty_rules:write',
    'penalties:propose',
    'penalties:review',
    'penalties:read_all',
    'reports:read',
  ]);

  await wireRole('hr_executive', [
    'config:read',
    'employees:read',
    'leave:read',
    'attendance:read',
    'attendance:write',
    'calendar:read',
    'notifications:read',
    'notifications:write',
    'pending_actions:read',
    'alerts:read',
    'directory:read',
    'penalties:propose',
    'penalties:read_all',
  ]);

  await wireRole('it_manager', ['employees:read', 'directory:read', 'calendar:read', 'notifications:read']);
  await wireRole('swe_manager', ['employees:read', 'directory:read', 'calendar:read', 'notifications:read']);
  await wireRole('tech_lead', ['employees:read', 'directory:read', 'calendar:read', 'notifications:read']);
  await wireRole('sales_manager', ['employees:read', 'directory:read', 'dashboard:read']);
  await wireRole('procurement_manager', ['purchasing:read', 'purchasing:write', 'purchasing:approve', 'inventory:read']);
  await wireRole('finance_manager', ['salary:read', 'reports:read', 'dashboard:read']);
  await wireRole('operations_manager', ['attendance:read', 'directory:read', 'dashboard:read']);

  await wireRole('employee', [
    'leave:read',
    'leave:write',
    'attendance:read',
    'notifications:read',
    'calendar:read',
    'directory:read',
  ]);

  console.log('  Roles and role_permissions seeded');

  // ── Leave types ───────────────────────────────────────────────────────────
  const ltNames = [
    'Annual Leave',
    'Sick Leave',
    'Casual Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Unpaid Leave',
    'Compensatory Leave',
    'Bereavement Leave',
  ];
  const LT = {};
  for (const n of ltNames) {
    const r = await client.query(
      `INSERT INTO leave_types (name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    LT[n] = r.rows[0].id;
  }

  // ── Allowance types ───────────────────────────────────────────────────────
  const atNames = [
    'House Rent Allowance',
    'Medical Allowance',
    'Transport Allowance',
    'Fuel Allowance',
    'Mobile Allowance',
    'Utility Allowance',
    'Performance Bonus',
    'Overtime Allowance',
  ];
  const AT = {};
  for (const n of atNames) {
    const r = await client.query(
      `INSERT INTO allowance_types (field_name, is_active) VALUES ($1, true) RETURNING id`,
      [n]
    );
    AT[n] = r.rows[0].id;
  }

  // ── Item categories & products (60+) ─────────────────────────────────────
  const categories = [
    'CCTV Cameras',
    'DVR/NVR Systems',
    'Access Control',
    'Fire Alarm Systems',
    'Network Equipment',
    'Cables & Accessories',
    'Power Supplies & UPS',
    'Biometric Devices',
    'Intercom Systems',
    'Software Licenses',
    'Tools & Hardware',
    'Consumables',
  ];
  const CAT = {};
  for (const c of categories) {
    const r = await client.query(
      `INSERT INTO item_categories (category_name, description) VALUES ($1, $2) RETURNING id`,
      [c, `${c} stock`]
    );
    CAT[c] = r.rows[0].id;
  }

  const products = [
    ['Hikvision 2MP Bullet Camera', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['Dahua 4MP Dome Camera', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['CP Plus 5MP PTZ Camera', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['Hikvision 16CH DVR', 'DVR/NVR Systems', 'ASSET', 'SERIAL'],
    ['Dahua 32CH NVR', 'DVR/NVR Systems', 'ASSET', 'SERIAL'],
    ['Cisco 24-Port Switch', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['MikroTik RouterBoard', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['UniFi Access Point', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['ZKTeco Access Panel', 'Access Control', 'ASSET', 'SERIAL'],
    ['Honeywell Smoke Detector', 'Fire Alarm Systems', 'ASSET', 'SERIAL'],
    ['CAT6 Cable (per meter)', 'Cables & Accessories', 'CONSUMABLE', 'NONE'],
    ['HDMI Cable 10m', 'Cables & Accessories', 'CONSUMABLE', 'NONE'],
    ['Power Cable 3-pin', 'Cables & Accessories', 'CONSUMABLE', 'NONE'],
    ['CCTV Annual Maintenance Contract', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Access Control Software License', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Cable Ties (pack of 100)', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['RJ45 Connectors (pack of 50)', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['12V DC PSU', 'Power Supplies & UPS', 'ASSET', 'SERIAL'],
    ['UPS 3KVA', 'Power Supplies & UPS', 'ASSET', 'SERIAL'],
    ['Biometric Reader X7', 'Biometric Devices', 'ASSET', 'SERIAL'],
    ['Video Intercom Kit', 'Intercom Systems', 'ASSET', 'SERIAL'],
    ['Fiber Patch Cord LC-LC', 'Cables & Accessories', 'CONSUMABLE', 'NONE'],
    ['PoE Injector 48V', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['Server Rack 42U', 'Tools & Hardware', 'ASSET', 'SERIAL'],
    ['Thermal Camera PTZ', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['ANPR Camera', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['Electric Strike Lock', 'Access Control', 'ASSET', 'SERIAL'],
    ['Door Controller Board', 'Access Control', 'ASSET', 'SERIAL'],
    ['Surveillance HDD 8TB', 'DVR/NVR Systems', 'ASSET', 'SERIAL'],
    ['Outdoor Junction Box', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['PVC Conduit 25mm', 'Cables & Accessories', 'CONSUMABLE', 'NONE'],
    ['Battery 12V 7Ah', 'Power Supplies & UPS', 'CONSUMABLE', 'NONE'],
    ['Face Recognition Terminal', 'Biometric Devices', 'ASSET', 'SERIAL'],
    ['Elevator COP Integration Kit', 'Access Control', 'ASSET', 'SERIAL'],
    ['Parking Barrier Arm', 'Access Control', 'ASSET', 'SERIAL'],
    ['Turnstile Controller', 'Access Control', 'ASSET', 'SERIAL'],
    ['Alarm Panel 8-Zone', 'Fire Alarm Systems', 'ASSET', 'SERIAL'],
    ['VESDA Aspirating Detector', 'Fire Alarm Systems', 'ASSET', 'SERIAL'],
    ['Gas Suppression Nozzle', 'Fire Alarm Systems', 'ASSET', 'SERIAL'],
    ['Industrial Switch 8-port', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['LTE Failover Router', 'Network Equipment', 'ASSET', 'IMEI'],
    ['Explosion-proof Camera', 'CCTV Cameras', 'ASSET', 'SERIAL'],
    ['Mobile DVR Enclosure IP67', 'DVR/NVR Systems', 'ASSET', 'SERIAL'],
    ['Solar Panel 150W', 'Power Supplies & UPS', 'ASSET', 'SERIAL'],
    ['Tower Camera Mast 6m', 'Tools & Hardware', 'ASSET', 'SERIAL'],
    ['Microwave Link 1Gbps', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['Fiber OTDR Rental Day', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Site Survey Consulting Day', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Commissioning Day Rate', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Training Essentials Seat', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Integration API Pack', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Keyboard for DVR', 'DVR/NVR Systems', 'CONSUMABLE', 'NONE'],
    ['Mounting Bracket Universal', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['Surge Protector PDU', 'Power Supplies & UPS', 'ASSET', 'SERIAL'],
    ['PDU Monitored 16A', 'Power Supplies & UPS', 'ASSET', 'SERIAL'],
    ['Ground Resistance Tester', 'Tools & Hardware', 'ASSET', 'SERIAL'],
    ['Fiber Scope 400x', 'Tools & Hardware', 'ASSET', 'SERIAL'],
    ['Label Printer Portable', 'Tools & Hardware', 'ASSET', 'SERIAL'],
    ['Safety Vest Reflective', 'Consumables', 'CONSUMABLE', 'NONE'],
    ['Hard Hat ANSI', 'Consumables', 'CONSUMABLE', 'NONE'],
    ['Crimping Tool Kit', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['Drill Bit Set Metal', 'Tools & Hardware', 'CONSUMABLE', 'NONE'],
    ['Forklift Reach Truck Rent Day', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Generator Diesel 50kVA Rent', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Smart Analytics Channel', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Health Check Quarterly', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Extended Warranty 3yr', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Penetration Test Bundle', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Vulnerability Scan Quarterly', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Firewall Rule Review Sprint', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Guest Wi-Fi Portal Premium', 'Software Licenses', 'SERVICE', 'NONE'],
    ['SIEM Correlation Rule Pack', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Container policy gate starter', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Immutable backup connector Wasabi', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Drone perimeter patrol lease monthly', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Satellite failover modem BGAN', 'Network Equipment', 'ASSET', 'SERIAL'],
    ['Mass SMS gateway redundancy pack', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Incident tabletop cyber drill', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Forklift inspection checklist digital', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Cooling tower fill replacement job', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Arc flash study lite', 'Software Licenses', 'SERVICE', 'NONE'],
    ['Battery recycling drum pickup batch', 'Consumables', 'CONSUMABLE', 'NONE'],
    ['Certificate of destruction digital vault', 'Software Licenses', 'SERVICE', 'NONE'],
  ];

  const PROD = {};
  for (const [pname, cat, ptype, track] of products) {
    const r = await client.query(
      `
      INSERT INTO products (product_name, category_id, product_type, tracking_type, quantity)
      VALUES ($1, $2, $3::text, $4::text, 0)
      RETURNING id
    `,
      [pname, CAT[cat], ptype, track]
    );
    PROD[pname] = r.rows[0].id;
  }
  console.log(`  Products seeded (${products.length})`);

  // Continue in part 2 (employees + attendance + procurement) — appended below
  await seedEmployeesAndHR(client, {
    D,
    DES,
    ET,
    JS,
    WM,
    WL,
    SH,
    LT,
    AT,
    PERM,
    roleIds,
    hrManagerRoleId,
    hrExecRoleId,
    employeeRoleId,
    superAdminRoleId,
    stdPass,
    hrMgrPass,
    superPass,
    PROD,
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (.env)');
    process.exit(1);
  }
  console.log('Starting ESSPL master_seed — 1990 to 2026-05-12');
  const client = await pool.connect();
  try {
    await truncateAll(client);
    console.log('Truncated all tables');

    await client.query('BEGIN');
    await seedViaPool(client);
    await client.query('COMMIT');
    console.log('Pool seed committed');

    await bootstrapVerify(client);
    await seedViaAPI();
    console.log('Done.');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
