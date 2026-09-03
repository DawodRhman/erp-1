import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

const SALT_ROUNDS = 12;

const roles = [
  ['super_admin', 'System Super Admin - full ERP access across CRM, Inventory, Finance and EMS'],
  ['csr_officer', 'CSR Officer - client requests, leads, quotations and approvals'],
  ['inventory_officer', 'Inventory Officer - stock, tokens, purchase orders and dispatches'],
  ['finance_officer', 'Finance Officer - accounts, invoices, billing and settlement'],
  ['inv_fin_admin', 'Inventory and Finance Admin - dual access to inventory and finance'],
];

const permissions = [
  ['crm:read', 'Read CRM clients, leads, quotations, orders and complaints'],
  ['crm:write', 'Create and update CRM clients, leads, quotations, orders and complaints'],
  ['inventory:read', 'Read inventory catalog, stock, tokens and dispatches'],
  ['inventory:write', 'Create and update inventory stock, tokens and dispatches'],
  ['inventory:admin', 'Administer inventory settings and master data'],
  ['accounts:read', 'Read accounts, invoices and finance data'],
  ['accounts:write', 'Create and update accounts, invoices and finance data'],
  ['matrix:sales', 'Access sales and CRM matrix operations'],
  ['matrix:operations', 'Access inventory and operations matrix'],
  ['matrix:field_service', 'Access field service and installer matrix'],
  ['matrix:finance', 'Access finance matrix operations'],
  ['purchasing:read', 'Read purchase orders and vendor receipts'],
  ['purchasing:write', 'Create and update purchase orders and receipts'],
  ['purchasing:approve', 'Approve purchase workflow records'],
];

const users = [
  {
    employeeId: 'EMP900',
    name: 'System Super Admin',
    fatherName: 'ESSPL',
    cnic: '42101-9000900-0',
    email: 'superadmin@esspl.com.pk',
    password: 'SuperAdmin@123!',
    role: 'super_admin',
    permissions: [],
    preserveExistingPermissions: true,
  },
  {
    employeeId: 'EMP904',
    name: 'CSR Officer',
    fatherName: 'ESSPL',
    cnic: '42101-9000904-4',
    email: 'csr.officer@esspl.com.pk',
    password: 'CsrPass@123!',
    role: 'csr_officer',
    permissions: ['crm:read', 'crm:write', 'matrix:sales'],
  },
  {
    employeeId: 'EMP901',
    name: 'Inventory Officer',
    fatherName: 'ESSPL',
    cnic: '42101-9000901-1',
    email: 'inventory.officer@esspl.com.pk',
    password: 'InventoryPass@123!',
    role: 'inventory_officer',
    permissions: [
      'inventory:read',
      'inventory:write',
      'inventory:admin',
      'purchasing:read',
      'purchasing:write',
      'purchasing:approve',
      'matrix:operations',
      'matrix:field_service',
    ],
  },
  {
    employeeId: 'EMP902',
    name: 'Finance Officer',
    fatherName: 'ESSPL',
    cnic: '42101-9000902-2',
    email: 'finance.officer@esspl.com.pk',
    password: 'FinancePass@123!',
    role: 'finance_officer',
    permissions: ['accounts:read', 'accounts:write', 'matrix:finance'],
  },
  {
    employeeId: 'EMP903',
    name: 'Inventory Finance Admin',
    fatherName: 'ESSPL',
    cnic: '42101-9000903-3',
    email: 'inv.fin.admin@esspl.com.pk',
    password: 'InvFinAdmin@123!',
    role: 'inv_fin_admin',
    permissions: [
      'inventory:read',
      'inventory:write',
      'inventory:admin',
      'purchasing:read',
      'purchasing:write',
      'purchasing:approve',
      'accounts:read',
      'accounts:write',
      'matrix:operations',
      'matrix:field_service',
      'matrix:finance',
    ],
  },
];

async function upsertRole(client, roleName, description) {
  const found = await client.query('SELECT id FROM public.roles WHERE role_name = $1 LIMIT 1', [roleName]);
  if (found.rows[0]?.id) {
    await client.query('UPDATE public.roles SET description = $2 WHERE id = $1', [found.rows[0].id, description]);
    return found.rows[0].id;
  }

  const inserted = await client.query(
    'INSERT INTO public.roles (role_name, description) VALUES ($1, $2) RETURNING id',
    [roleName, description],
  );
  return inserted.rows[0].id;
}

async function upsertPermission(client, permissionKey, description) {
  const result = await client.query(
    `
      INSERT INTO public.permissions (permission_key, description)
      VALUES ($1, $2)
      ON CONFLICT (permission_key)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `,
    [permissionKey, description],
  );
  return result.rows[0].id;
}

async function ensureEmployee(client, user) {
  await client.query(
    `
      INSERT INTO public.employee_info (employee_id, name, father_name, cnic, date_of_birth)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        father_name = EXCLUDED.father_name,
        cnic = EXCLUDED.cnic,
        date_of_birth = EXCLUDED.date_of_birth,
        updated_at = now()
    `,
    [user.employeeId, user.name, user.fatherName, user.cnic, '01-01-1995'],
  );
}

async function ensureUser(client, user, roleId) {
  const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

  await client.query(
    `
      INSERT INTO public.users (
        employee_id,
        email,
        password,
        role_id,
        is_active,
        must_change_password,
        password_changed_at
      )
      VALUES ($1, $2, $3, $4, TRUE, FALSE, now())
      ON CONFLICT (email)
      DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        password = EXCLUDED.password,
        role_id = EXCLUDED.role_id,
        is_active = TRUE,
        must_change_password = FALSE,
        password_changed_at = now(),
        updated_at = now()
    `,
    [user.employeeId, user.email, passwordHash, roleId],
  );
}

async function grantRolePermissions(client, roleId, permissionKeys) {
  for (const permissionKey of permissionKeys) {
    const permission = await client.query('SELECT id FROM public.permissions WHERE permission_key = $1 LIMIT 1', [permissionKey]);
    if (!permission.rows[0]?.id) continue;

    await client.query(
      `
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [roleId, permission.rows[0].id],
    );
  }
}

async function syncRolePermissions(client, roleId, permissionKeys) {
  await client.query(
    `
      DELETE FROM public.role_permissions rp
      USING public.permissions p
      WHERE rp.permission_id = p.id
        AND rp.role_id = $1
        AND NOT (p.permission_key = ANY($2::text[]))
    `,
    [roleId, permissionKeys],
  );

  await grantRolePermissions(client, roleId, permissionKeys);
}

async function retireDeprecatedInstallerPortal(client) {
  await client.query(
    `
      UPDATE public.users
      SET is_active = FALSE,
          updated_at = now()
      WHERE email = 'installer@esspl.com.pk'
    `,
  );
}

const client = await pool.connect();

try {
  await client.query('BEGIN');

  const roleIds = new Map();
  for (const [roleName, description] of roles) {
    roleIds.set(roleName, await upsertRole(client, roleName, description));
  }

  for (const [permissionKey, description] of permissions) {
    await upsertPermission(client, permissionKey, description);
  }

  for (const user of users) {
    const roleId = roleIds.get(user.role);
    await ensureEmployee(client, user);
    await ensureUser(client, user, roleId);
    if (user.preserveExistingPermissions) {
      await grantRolePermissions(
        client,
        roleId,
        permissions.map(([permissionKey]) => permissionKey),
      );
    } else {
      await syncRolePermissions(client, roleId, user.permissions);
    }
  }

  await retireDeprecatedInstallerPortal(client);

  await client.query('COMMIT');

  console.log('Service demo users repaired successfully.');
  for (const user of users) {
    console.log(`- ${user.email} (${user.role})`);
  }
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Failed to repair service demo users:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
