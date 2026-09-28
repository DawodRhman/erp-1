/**
 * ESSPL production bootstrap seed.
 *
 * This is intentionally small. It creates only the master/config data required
 * to start the system and one Super Admin login. It does not create demo
 * attendance, leave, penalties, announcements, calendar events, products, or
 * fake employee history.
 *
 * Usage:
 *   npm run db:seed:production
 */

import 'dotenv/config';
import { pathToFileURL } from 'url';

export const PRODUCTION_SUPER_ADMIN = {
  email: 'superadmin@esspl.com.pk',
  password: 'SuperAdmin@123!',
};

export const PRODUCTION_DEPARTMENTS = [
  { code: 'DEPT-IT', name: 'Information Technology' },
  { code: 'DEPT-HR', name: 'Human Resources' },
  { code: 'DEPT-SALES', name: 'Sales' },
];

export const PRODUCTION_DESIGNATIONS_BY_DEPARTMENT = {
  'Information Technology': ['IT Manager', 'System Administrator', 'Software Engineer', 'IT Support Engineer'],
  'Human Resources': ['HR Manager', 'HR Executive', 'HR Officer'],
  Sales: ['Sales Manager', 'Sales Executive', 'Business Development Executive'],
};

const PERMISSION_KEYS = [
  ['config:read', 'Read system configuration'],
  ['config:write', 'Write system configuration'],
  ['config:manage', 'Legacy config management alias'],
  ['employees:self_read', 'View own employee profile'],
  ['employees:read', 'View employee records'],
  ['employees:department_read', 'View employee records in assigned department scope'],
  ['employees:write', 'Create and update employees'],
  ['employee_attachments:read', 'Read employee attachments'],
  ['employee_attachments:upload', 'Upload employee attachments'],
  ['salary:read', 'Read salary'],
  ['salary:write', 'Manage salary revisions'],
  ['allowances:read', 'Read allowances'],
  ['allowances:write', 'Manage allowances'],
  ['leave:read', 'Read leave'],
  ['leave:department_read', 'Read leave in assigned department scope'],
  ['leave:write', 'Submit leave'],
  ['leave:approve', 'Approve leave'],
  ['leave:department_approve', 'Approve leave in assigned department scope'],
  ['leave_capacity:read', 'Read leave capacity'],
  ['leave_capacity:write', 'Manage leave capacity'],
  ['attendance:read', 'Read attendance'],
  ['attendance:department_read', 'Read attendance in assigned department scope'],
  ['attendance:write', 'Write attendance'],
  ['attendance:submit_ho', 'Submit attendance to Head Office'],
  ['attendance:unlock', 'Unlock attendance'],
  ['calendar:read', 'Read calendar'],
  ['calendar:write', 'Write calendar'],
  ['calendar:department_write', 'Write calendar in assigned department scope'],
  ['notifications:read', 'Read notifications'],
  ['notifications:write', 'Create notifications'],
  ['alerts:read', 'Read urgent alerts'],
  ['pending_actions:read', 'Read pending actions'],
  ['dashboard:read', 'Read HR dashboard'],
  ['dashboard:department_read', 'Read assigned department dashboard'],
  ['directory:read', 'Read directory'],
  ['directory:write', 'Write directory'],
  ['announcements:read', 'Read announcements'],
  ['announcements:write', 'Write announcements'],
  ['announcements:department_write', 'Write announcements in assigned department scope'],
  ['inventory:read', 'Read inventory'],
  ['inventory:write', 'Write inventory'],
  ['purchasing:read', 'Read purchasing'],
  ['purchasing:write', 'Write purchasing'],
  ['purchasing:approve', 'Approve purchasing'],
  ['hr:full_access', 'HR full access placeholder'],
  ['payroll:read', 'Payroll read placeholder'],
  ['payroll:write', 'Payroll write placeholder'],
  ['penalty_rules:write', 'Manage penalty rules'],
  ['penalties:propose', 'Propose penalties'],
  ['penalties:review', 'Review penalties'],
  ['penalties:read_own', 'Read own penalties'],
  ['penalties:read_all', 'Read all penalties'],
  ['penalties:department_read', 'Read penalties in assigned department scope'],
  ['penalties:department_propose', 'Propose penalties in assigned department scope'],
  ['reports:read', 'Read reports'],
];

const ROLE_PERMISSIONS = {
  head_hr: [
    'config:read',
    'config:write',
    'employees:read',
    'employees:write',
    'employee_attachments:read',
    'employee_attachments:upload',
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
    'attendance:unlock',
    'calendar:read',
    'calendar:write',
    'notifications:read',
    'notifications:write',
    'alerts:read',
    'pending_actions:read',
    'dashboard:read',
    'directory:read',
    'directory:write',
    'announcements:read',
    'announcements:write',
    'penalty_rules:write',
    'penalties:propose',
    'penalties:review',
    'penalties:read_all',
    'reports:read',
  ],
  hr_manager: [
    'config:read',
    'config:write',
    'employees:self_read',
    'employees:read',
    'employees:write',
    'employee_attachments:read',
    'employee_attachments:upload',
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
    'dashboard:read',
    'directory:read',
    'announcements:read',
    'announcements:write',
    'penalties:propose',
    'penalties:review',
    'penalties:read_all',
  ],
  hr_executive: [
    'config:read',
    'employees:self_read',
    'employees:read',
    'employees:write',
    'employee_attachments:read',
    'employee_attachments:upload',
    'leave:read',
    'leave:write',
    'attendance:read',
    'attendance:write',
    'calendar:read',
    'notifications:read',
    'dashboard:read',
    'directory:read',
    'announcements:read',
    'penalties:propose',
    'penalties:read_all',
  ],
  department_head: [
    'employees:self_read',
    'employees:department_read',
    'config:read',
    'leave:department_read',
    'leave:department_approve',
    'attendance:department_read',
    'calendar:read',
    'calendar:department_write',
    'notifications:read',
    'dashboard:department_read',
    'directory:read',
    'announcements:read',
    'announcements:department_write',
    'penalties:department_read',
    'penalties:department_propose',
    'penalties:read_own',
  ],
  ceo: [
    'config:read',
    'employees:read',
    'employee_attachments:read',
    'salary:read',
    'allowances:read',
    'leave:read',
    'leave_capacity:read',
    'attendance:read',
    'calendar:read',
    'notifications:read',
    'alerts:read',
    'pending_actions:read',
    'dashboard:read',
    'directory:read',
    'announcements:read',
    'penalties:read_all',
    'reports:read',
    'inventory:read',
    'purchasing:read',
  ],
  employee: [
    'employees:self_read',
    'leave:write',
    'calendar:read',
    'notifications:read',
    'directory:read',
    'announcements:read',
    'penalties:read_own',
  ],
};

async function hashPassword(password) {
  const bcrypt = await import('bcrypt');
  return bcrypt.default.hash(password, 12);
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
      employee_attachments,
      employee_job_history,
      job_info,
      employee_contacts,
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
}

async function seedPermissions(client) {
  await client.query(
    `
      INSERT INTO public.permissions (permission_key, description)
      SELECT permission_key, description
      FROM unnest($1::text[], $2::text[]) AS p(permission_key, description)
      ON CONFLICT (permission_key) DO NOTHING
    `,
    [PERMISSION_KEYS.map(([key]) => key), PERMISSION_KEYS.map(([, description]) => description)]
  );
}

async function insertLookupValues(client, table, column, values) {
  for (const value of values) {
    await client.query(
      `INSERT INTO public.${table} (${column}, is_active) VALUES ($1, true) ON CONFLICT DO NOTHING`,
      [value]
    );
  }
}

async function seedDepartmentsAndDesignations(client) {
  const departmentIds = new Map();

  for (const department of PRODUCTION_DEPARTMENTS) {
    const result = await client.query(
      `
        INSERT INTO public.departments (department_code, department_name, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (department_code) DO UPDATE
        SET department_name = EXCLUDED.department_name,
            is_active = true
        RETURNING id
      `,
      [department.code, department.name]
    );
    departmentIds.set(department.name, result.rows[0].id);
  }

  for (const [departmentName, designations] of Object.entries(PRODUCTION_DESIGNATIONS_BY_DEPARTMENT)) {
    const departmentId = departmentIds.get(departmentName);
    for (const title of designations) {
      await client.query(
        `
          INSERT INTO public.designations (title, department_id, is_active)
          VALUES ($1, $2, true)
          ON CONFLICT (title) DO UPDATE
          SET department_id = EXCLUDED.department_id,
              is_active = true
        `,
        [title, departmentId]
      );
    }
  }

  return departmentIds;
}

async function seedRoles(client, departmentIds) {
  await client.query('ALTER TABLE public.roles ALTER COLUMN department_id DROP NOT NULL');

  const roles = [
    ['super_admin', 'Full platform access', null],
    ['head_hr', 'Head Office HR', departmentIds.get('Human Resources')],
    ['hr_manager', 'HR Manager', departmentIds.get('Human Resources')],
    ['hr_executive', 'HR Executive', departmentIds.get('Human Resources')],
    ['department_head', 'Department Head', null],
    ['ceo', 'Chief Executive Officer read-only access', null],
    ['employee', 'Standard employee self-service', null],
  ];

  const roleIds = new Map();
  for (const [roleName, description, departmentId] of roles) {
    const result = await client.query(
      `
        INSERT INTO public.roles (department_id, role_name, description)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [departmentId, roleName, description]
    );
    roleIds.set(roleName, result.rows[0].id);
  }

  const permissions = await client.query(`SELECT id, permission_key FROM public.permissions`);
  const permissionIds = new Map(permissions.rows.map((row) => [row.permission_key, row.id]));

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds.get(roleName);
    const ids = permissionKeys.map((key) => permissionIds.get(key)).filter(Boolean);
    if (!roleId || !ids.length) continue;
    await client.query(
      `
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT $1::uuid, permission_id::uuid
        FROM unnest($2::uuid[]) AS p(permission_id)
        ON CONFLICT DO NOTHING
      `,
      [roleId, ids]
    );
  }

  return roleIds;
}

async function seedConfiguration(client) {
  await insertLookupValues(client, 'employment_types', 'type_name', [
    'Full-Time',
    'Part-Time',
    'Contract',
    'Internship',
    'Probationary',
  ]);
  await insertLookupValues(client, 'job_statuses', 'status_name', [
    'Active',
    'Probation',
    'On Leave',
    'Suspended',
    'Terminated',
    'Resigned',
  ]);
  await insertLookupValues(client, 'work_modes', 'mode_name', [
    'On-Site',
    'Remote',
    'Hybrid',
    'Field',
  ]);
  await insertLookupValues(client, 'work_locations', 'location_name', [
    'Head Office - Karachi',
    'Branch Office - Lahore',
    'Branch Office - Islamabad',
  ]);
  await insertLookupValues(client, 'leave_types', 'name', [
    'Annual Leave',
    'Sick Leave',
    'Casual Leave',
    'Unpaid Leave',
  ]);

  const shifts = [
    ['Morning Shift', '09:00:00', '18:00:00', 15],
    ['Evening Shift', '14:00:00', '22:00:00', 15],
    ['Field Shift', '09:00:00', '18:00:00', 30],
  ];
  for (const [name, start, end, lateAfter] of shifts) {
    await client.query(
      `
        INSERT INTO public.shifts (name, start_time, end_time, late_after_minutes, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (name) DO UPDATE
        SET start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            late_after_minutes = EXCLUDED.late_after_minutes,
            is_active = true
      `,
      [name, start, end, lateAfter]
    );
  }

  for (const allowanceName of ['House Rent Allowance', 'Medical Allowance', 'Transport Allowance']) {
    await client.query(
      `
        INSERT INTO public.allowance_types (field_name, is_active)
        VALUES ($1, true)
      `,
      [allowanceName]
    );
  }

  for (const [ruleName, amount, description] of [
    ['Late Arrival', 500, 'Penalty for late arrival after allowed grace time'],
    ['Unapproved Absence', 1500, 'Penalty for absence without approval'],
  ]) {
    await client.query(
      `
        INSERT INTO public.penalty_rules (name, amount_pkr, type, is_active)
        VALUES ($1, $2, 'flat', true)
      `,
      [ruleName, amount]
    );
  }
}

async function seedSuperAdmin(client, roleIds) {
  const hashedPassword = await hashPassword(PRODUCTION_SUPER_ADMIN.password);
  await client.query(
    `
      INSERT INTO public.users (employee_id, email, password, role_id, must_change_password, password_changed_at)
      VALUES ($1, $2, $3, $4, true, NULL)
    `,
    [
      null,
      PRODUCTION_SUPER_ADMIN.email,
      hashedPassword,
      roleIds.get('super_admin'),
    ]
  );
}

export async function seedProductionDatabase(client) {
  await truncateAll(client);
  await seedPermissions(client);
  const departmentIds = await seedDepartmentsAndDesignations(client);
  const roleIds = await seedRoles(client, departmentIds);
  await seedConfiguration(client);
  await seedSuperAdmin(client, roleIds);

  return {
    departments: PRODUCTION_DEPARTMENTS.length,
    designations: Object.values(PRODUCTION_DESIGNATIONS_BY_DEPARTMENT).flat().length,
    superAdminEmail: PRODUCTION_SUPER_ADMIN.email,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (.env)');
    process.exit(1);
  }

  const { default: pool } = await import('../src/config/db.js');
  const client = await pool.connect();
  try {
    console.log('Starting ESSPL production seed');
    await client.query('BEGIN');
    const summary = await seedProductionDatabase(client);
    await client.query('COMMIT');
    console.log(`Production seed committed: ${summary.departments} departments, ${summary.designations} designations`);
    console.log(`Super Admin email: ${PRODUCTION_SUPER_ADMIN.email}`);
    console.log(`Super Admin password: ${PRODUCTION_SUPER_ADMIN.password}`);
    console.log('Super Admin must change password on first login.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Production seed failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
