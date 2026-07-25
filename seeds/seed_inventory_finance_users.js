import bcrypt from 'bcrypt';
import 'dotenv/config';
import pool from '../src/config/db.js';

async function seedInventoryFinanceUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Seeding Inventory & Finance dedicated demo accounts...');

    // 1. Roles
    const rolesToCreate = [
      { name: 'inventory_officer', desc: 'Inventory Officer — Catalog, Stock Tracking, PO, Invoices' },
      { name: 'finance_officer', desc: 'Finance Officer — Accounts, Billing, Reconciliation, Virtual Debt' },
      { name: 'inv_fin_admin', desc: 'Inventory & Finance Admin — Dual Access to Inventory and Finance' },
    ];

    const roleMap = {};
    for (const r of rolesToCreate) {
      let res = await client.query(`SELECT id FROM public.roles WHERE role_name = $1`, [r.name]);
      if (res.rows.length === 0) {
        res = await client.query(
          `INSERT INTO public.roles (role_name, description) VALUES ($1, $2) RETURNING id`,
          [r.name, r.desc]
        );
      }
      roleMap[r.name] = res.rows[0].id;
    }

    // 2. Passwords
    const invPass = await bcrypt.hash('InventoryPass@123!', 12);
    const finPass = await bcrypt.hash('FinancePass@123!', 12);
    const dualPass = await bcrypt.hash('InvFinAdmin@123!', 12);

    // 3. Demo Users
    const usersToCreate = [
      {
        emp_id: 'EMP901',
        cnic: '35202-9000001-0',
        name: 'Inventory Officer',
        email: 'inventory.officer@esspl.com.pk',
        role_name: 'inventory_officer',
        password_hash: invPass,
      },
      {
        emp_id: 'EMP902',
        cnic: '35202-9000002-0',
        name: 'Finance Officer',
        email: 'finance.officer@esspl.com.pk',
        role_name: 'finance_officer',
        password_hash: finPass,
      },
      {
        emp_id: 'EMP903',
        cnic: '35202-9000003-0',
        name: 'Joint Admin',
        email: 'inv.fin.admin@esspl.com.pk',
        role_name: 'inv_fin_admin',
        password_hash: dualPass,
      },
    ];

    for (const u of usersToCreate) {
      // Ensure employee_info record exists
      const empRes = await client.query(`SELECT employee_id FROM public.employee_info WHERE employee_id = $1`, [u.emp_id]);
      if (empRes.rows.length === 0) {
        await client.query(
          `INSERT INTO public.employee_info (employee_id, name, father_name, cnic, date_of_birth)
           VALUES ($1, $2, 'Demo Father', $3, '1990-01-01')`,
          [u.emp_id, u.name, u.cnic]
        );
      }

      const roleId = roleMap[u.role_name];
      const existingUser = await client.query(`SELECT id FROM public.users WHERE email = $1`, [u.email]);
      if (existingUser.rows.length > 0) {
        await client.query(
          `UPDATE public.users
           SET role_id = $1, password = $2, is_active = TRUE, must_change_password = FALSE
           WHERE email = $3`,
          [roleId, u.password_hash, u.email]
        );
      } else {
        await client.query(
          `INSERT INTO public.users (employee_id, email, role_id, password, is_active, must_change_password)
           VALUES ($1, $2, $3, $4, TRUE, FALSE)`,
          [u.emp_id, u.email, roleId, u.password_hash]
        );
      }
    }

    // 4. Map Permissions
    const permKeys = [
      'inventory:read',
      'inventory:write',
      'inventory:admin',
      'accounts:read',
      'accounts:write',
      'matrix:sales',
      'matrix:operations',
      'matrix:field_service',
      'matrix:finance',
    ];

    const permMap = {};
    for (const key of permKeys) {
      const pRes = await client.query(`SELECT id FROM public.permissions WHERE permission_key = $1`, [key]);
      if (pRes.rows.length > 0) {
        permMap[key] = pRes.rows[0].id;
      }
    }

    // Grant Inventory Officer permissions
    const invPerms = ['inventory:read', 'inventory:write', 'inventory:admin', 'matrix:operations'];
    for (const k of invPerms) {
      if (permMap[k]) {
        await client.query(
          `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['inventory_officer'], permMap[k]]
        );
      }
    }

    // Grant Finance Officer permissions
    const finPerms = ['accounts:read', 'accounts:write', 'matrix:finance', 'inventory:read'];
    for (const k of finPerms) {
      if (permMap[k]) {
        await client.query(
          `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['finance_officer'], permMap[k]]
        );
      }
    }

    // Grant Dual Admin ALL permissions
    for (const k of permKeys) {
      if (permMap[k]) {
        await client.query(
          `INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleMap['inv_fin_admin'], permMap[k]]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Inventory, Finance, and Joint Access Demo Users seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding demo accounts:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedInventoryFinanceUsers();
