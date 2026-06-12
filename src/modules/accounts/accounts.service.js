import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export const DEFAULT_CREDENTIAL_WHATSAPP_TEMPLATE =
  '*Welcome to ESSPL HR*\n\nHello {employeeName},\n\nYour login account has been created.\n\nEmployee ID: {employeeId}\nEmail: {email}\nPassword: {password}\n\nLogin here: {loginUrl}\n\nPlease change your password after first login.';

const CREDENTIAL_TEMPLATE_KEY = 'credential_whatsapp_template';

function mapAccount(row) {
  return {
    id: row.id,
    employee_id: row.employee_id || null,
    email: row.email,
    role_id: row.role_id,
    role_name: row.role_name || null,
    role_description: row.role_description || null,
    employee_name: row.employee_name || null,
    linked_employee: row.employee_id
      ? `${row.employee_name || 'Employee'} (${row.employee_id})`
      : 'Account only',
    is_active: row.is_active !== false,
    status: row.is_active === false ? 'Inactive' : 'Active',
    must_change_password: Boolean(row.must_change_password),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAccounts() {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.employee_id,
        u.email,
        u.role_id,
        COALESCE(u.is_active, true) AS is_active,
        u.must_change_password,
        u.created_at,
        u.updated_at,
        r.role_name,
        r.description AS role_description,
        ei.name AS employee_name
      FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.employee_info ei ON ei.employee_id = u.employee_id
      ORDER BY
        CASE WHEN r.role_name = 'super_admin' THEN 0 ELSE 1 END,
        r.role_name ASC NULLS LAST,
        u.email ASC
    `
  );

  return result.rows.map(mapAccount);
}

export async function updateAccountStatus(accountId, isActive) {
  const existing = await pool.query(
    `
      SELECT u.id, COALESCE(u.is_active, true) AS is_active, r.role_name
      FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [accountId]
  );

  if (existing.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found.');
  }

  if (existing.rows[0]?.role_name === 'super_admin' && isActive === false) {
    throw new AppError(403, 'PROTECTED_ACCOUNT', 'Super Admin account cannot be deactivated.');
  }

  const result = await pool.query(
    `
      UPDATE public.users
      SET is_active = $1,
          updated_at = now()
      WHERE id = $2
      RETURNING id, employee_id, email, role_id, is_active, must_change_password, created_at, updated_at
    `,
    [Boolean(isActive), accountId]
  );

  return result.rows[0];
}

export async function getCredentialTemplate() {
  const result = await pool.query(
    `
      SELECT setting_value
      FROM public.system_settings
      WHERE setting_key = $1
      LIMIT 1
    `,
    [CREDENTIAL_TEMPLATE_KEY]
  );

  return {
    template: result.rows[0]?.setting_value || DEFAULT_CREDENTIAL_WHATSAPP_TEMPLATE,
    availablePlaceholders: ['employeeName', 'employeeId', 'email', 'password', 'loginUrl'],
  };
}

export async function updateCredentialTemplate(template, updatedByUserId = null) {
  const normalized = String(template || '').trim();
  if (!normalized) {
    throw new AppError(422, 'INVALID_TEMPLATE', 'Credential message template is mandatory.');
  }

  if (normalized.length > 2000) {
    throw new AppError(422, 'INVALID_TEMPLATE', 'Credential message template must be 2000 characters or fewer.');
  }

  if (!normalized.includes('{email}') || !normalized.includes('{password}')) {
    throw new AppError(422, 'INVALID_TEMPLATE', 'Credential message template must include {email} and {password}.');
  }

  const result = await pool.query(
    `
      INSERT INTO public.system_settings (setting_key, setting_value, description, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING setting_value
    `,
    [
      CREDENTIAL_TEMPLATE_KEY,
      normalized,
      'WhatsApp message template used when sharing employee login credentials.',
      updatedByUserId,
    ]
  );

  return {
    template: result.rows[0]?.setting_value || normalized,
    availablePlaceholders: ['employeeName', 'employeeId', 'email', 'password', 'loginUrl'],
  };
}
