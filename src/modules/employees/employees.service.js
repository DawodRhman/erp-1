import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { generateTempPassword, hashPassword } from '../auth/auth.service.js';

function nextEmployeeCodeFromMax(maxEmployeeId) {
  const current = Number((maxEmployeeId || 'EMP000').replace('EMP', '')) || 0;
  const next = current + 1;
  return `EMP${String(next).padStart(3, '0')}`;
}

export async function createEmployee(data, createdByUserId) {
  const { personalInfo, jobInfo, accountInfo, extraInfo } = data;

  const duplicateCnic = await pool.query(
    `SELECT 1 FROM public.employee_info WHERE cnic = $1 LIMIT 1`,
    [personalInfo.cnic]
  );

  if (duplicateCnic.rowCount > 0) {
    throw new AppError(409, 'DUPLICATE_CNIC', 'CNIC already exists.');
  }

  const duplicateEmail = await pool.query(
    `SELECT 1 FROM public.users WHERE email = $1 LIMIT 1`,
    [accountInfo.email]
  );

  if (duplicateEmail.rowCount > 0) {
    throw new AppError(409, 'DUPLICATE_EMAIL', 'Email already exists.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const maxEmployeeResult = await client.query(
      `SELECT MAX(employee_id) AS max_employee_id FROM public.employee_info`
    );
    const employeeId = nextEmployeeCodeFromMax(maxEmployeeResult.rows[0]?.max_employee_id);

    const employeeInsert = await client.query(
      `
        INSERT INTO public.employee_info (
          employee_id,
          name,
          father_name,
          cnic,
          date_of_birth
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        employeeId,
        personalInfo.name,
        personalInfo.father_name,
        personalInfo.cnic,
        personalInfo.date_of_birth,
      ]
    );

    await client.query(
      `
        INSERT INTO public.job_info (
          employee_id,
          department_id,
          designation_id,
          employment_type_id,
          job_status_id,
          work_mode_id,
          work_location_id,
          shift_id,
          date_of_joining,
          date_of_exit,
          probation_end_date,
          contract_end_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        employeeId,
        jobInfo.department_id,
        jobInfo.designation_id,
        jobInfo.employment_type_id,
        jobInfo.job_status_id,
        jobInfo.work_mode_id,
        jobInfo.work_location_id,
        jobInfo.shift_id,
        jobInfo.date_of_joining,
        jobInfo.date_of_exit || null,
        jobInfo.probation_end_date || null,
        jobInfo.contract_end_date || null,
      ]
    );

    if (extraInfo) {
      await client.query(
        `
          INSERT INTO public.extra_employee_info (
            employee_id,
            contact_1,
            contact_2,
            emergence_contact_1,
            emergence_contact_2,
            bank_name,
            bank_acc_num,
            perment_address,
            postal_address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          employeeId,
          extraInfo.contact_1 || accountInfo.phone,
          extraInfo.contact_2 || null,
          extraInfo.emergence_contact_1 || null,
          extraInfo.emergence_contact_2 || null,
          extraInfo.bank_name || null,
          extraInfo.bank_acc_num || null,
          extraInfo.perment_address || null,
          extraInfo.postal_address || null,
        ]
      );
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    await client.query(
      `
        INSERT INTO public.users (
          employee_id,
          email,
          password,
          role_id,
          must_change_password
        )
        VALUES ($1, $2, $3, $4, true)
      `,
      [employeeId, accountInfo.email, hashedPassword, accountInfo.role_id || null]
    );

    await client.query(
      `
        INSERT INTO public.directory_entries (
          employee_id,
          name,
          email,
          phone_mobile,
          department_id,
          branch_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        employeeId,
        personalInfo.name,
        accountInfo.email,
        accountInfo.phone || null,
        jobInfo.department_id,
        jobInfo.work_location_id,
        createdByUserId,
      ]
    );

    await client.query('COMMIT');

    return {
      employee: employeeInsert.rows[0],
      tempPassword,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getEmployees({
  search,
  department_id,
  is_active,
  page = 1,
  limit = 20,
}) {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const whereParts = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereParts.push(`(ei.employee_id ILIKE $${params.length} OR ei.name ILIKE $${params.length})`);
  }

  if (department_id) {
    params.push(department_id);
    whereParts.push(`ji.department_id = $${params.length}`);
  }

  if (typeof is_active === 'boolean') {
    params.push(is_active);
    whereParts.push(`COALESCE(u.is_active, true) = $${params.length}`);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      ei.employee_id,
      ei.name,
      dsg.title AS designation_title,
      dep.department_name,
      js.status_name AS status,
      ji.date_of_joining
    FROM public.employee_info ei
    JOIN public.job_info ji ON ji.employee_id = ei.employee_id
    LEFT JOIN public.departments dep ON dep.id = ji.department_id
    LEFT JOIN public.designations dsg ON dsg.id = ji.designation_id
    LEFT JOIN public.job_statuses js ON js.id = ji.job_status_id
    LEFT JOIN public.users u ON u.employee_id = ei.employee_id
    ${whereSql}
    ORDER BY ei.employee_id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM public.employee_info ei
    JOIN public.job_info ji ON ji.employee_id = ei.employee_id
    LEFT JOIN public.users u ON u.employee_id = ei.employee_id
    ${whereSql}
  `;

  const dataResult = await pool.query(dataQuery, [...params, normalizedLimit, offset]);
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rows[0]?.total || 0;

  return {
    data: dataResult.rows,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      pages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
  };
}

export async function getEmployeeById(employeeId) {
  const result = await pool.query(
    `
      SELECT
        ei.*,
        ex.contact_1,
        ex.contact_2,
        ex.emergence_contact_1,
        ex.emergence_contact_2,
        ex.bank_name,
        ex.bank_acc_num,
        ex.perment_address,
        ex.postal_address,
        ji.department_id,
        ji.designation_id,
        ji.employment_type_id,
        ji.job_status_id,
        ji.work_mode_id,
        ji.work_location_id,
        ji.shift_id,
        ji.date_of_joining,
        ji.date_of_exit,
        ji.probation_end_date,
        ji.contract_end_date,
        dep.department_name,
        dep.department_code,
        dsg.title AS designation_title,
        et.type_name AS employment_type_name,
        js.status_name AS job_status_name,
        wm.mode_name AS work_mode_name,
        wl.location_name AS work_location_name,
        s.name AS shift_name,
        s.start_time AS shift_start_time,
        s.end_time AS shift_end_time,
        s.late_after_minutes
      FROM public.employee_info ei
      LEFT JOIN public.extra_employee_info ex ON ex.employee_id = ei.employee_id
      LEFT JOIN public.job_info ji ON ji.employee_id = ei.employee_id
      LEFT JOIN public.departments dep ON dep.id = ji.department_id
      LEFT JOIN public.designations dsg ON dsg.id = ji.designation_id
      LEFT JOIN public.employment_types et ON et.id = ji.employment_type_id
      LEFT JOIN public.job_statuses js ON js.id = ji.job_status_id
      LEFT JOIN public.work_modes wm ON wm.id = ji.work_mode_id
      LEFT JOIN public.work_locations wl ON wl.id = ji.work_location_id
      LEFT JOIN public.shifts s ON s.id = ji.shift_id
      WHERE ei.employee_id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found.');
  }

  return result.rows[0];
}

export async function updatePersonalInfo(employeeId, data) {
  const allowedFields = ['name', 'father_name', 'cnic', 'date_of_birth'];
  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      params.push(data[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return getEmployeeById(employeeId);
  }

  params.push(employeeId);

  const result = await pool.query(
    `
      UPDATE public.employee_info
      SET ${updates.join(', ')}, updated_at = now()
      WHERE employee_id = $${params.length}
      RETURNING *
    `,
    params
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found.');
  }

  return result.rows[0];
}

export async function updateJobInfo(employeeId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT *
        FROM public.job_info
        WHERE employee_id = $1
        LIMIT 1
      `,
      [employeeId]
    );

    if (currentResult.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Employee job info not found.');
    }

    const current = currentResult.rows[0];
    const departmentChanged =
      Object.prototype.hasOwnProperty.call(data, 'department_id') &&
      data.department_id !== current.department_id;
    const designationChanged =
      Object.prototype.hasOwnProperty.call(data, 'designation_id') &&
      data.designation_id !== current.designation_id;

    if (departmentChanged || designationChanged) {
      await client.query(
        `
          INSERT INTO public.employee_job_history (
            employee_id,
            department_id,
            designation_id,
            manager_emp_id,
            start_date,
            end_date
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
        `,
        [
          employeeId,
          current.department_id,
          current.designation_id,
          data.manager_emp_id || null,
          current.date_of_joining,
        ]
      );
    }

    const allowedFields = [
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
    ];

    const updates = [];
    const params = [];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        params.push(data[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      await client.query('COMMIT');
      return current;
    }

    params.push(employeeId);
    const updatedResult = await client.query(
      `
        UPDATE public.job_info
        SET ${updates.join(', ')}, updated_at = now()
        WHERE employee_id = $${params.length}
        RETURNING *
      `,
      params
    );

    await client.query('COMMIT');
    return updatedResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateExtraInfo(employeeId, data) {
  const existing = await pool.query(
    `SELECT contact_1 FROM public.extra_employee_info WHERE employee_id = $1 LIMIT 1`,
    [employeeId]
  );

  const contact1 = data.contact_1 || existing.rows[0]?.contact_1;
  if (!contact1) {
    throw new AppError(400, 'CONTACT_REQUIRED', 'contact_1 is required.');
  }

  const result = await pool.query(
    `
      INSERT INTO public.extra_employee_info (
        employee_id,
        contact_1,
        contact_2,
        emergence_contact_1,
        emergence_contact_2,
        bank_name,
        bank_acc_num,
        perment_address,
        postal_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        contact_1 = EXCLUDED.contact_1,
        contact_2 = EXCLUDED.contact_2,
        emergence_contact_1 = EXCLUDED.emergence_contact_1,
        emergence_contact_2 = EXCLUDED.emergence_contact_2,
        bank_name = EXCLUDED.bank_name,
        bank_acc_num = EXCLUDED.bank_acc_num,
        perment_address = EXCLUDED.perment_address,
        postal_address = EXCLUDED.postal_address,
        updated_at = now()
      RETURNING *
    `,
    [
      employeeId,
      contact1,
      data.contact_2 || null,
      data.emergence_contact_1 || null,
      data.emergence_contact_2 || null,
      data.bank_name || null,
      data.bank_acc_num || null,
      data.perment_address || null,
      data.postal_address || null,
    ]
  );

  return result.rows[0];
}

export async function resendCredentials(employeeId) {
  const userResult = await pool.query(
    `
      SELECT u.id, ex.contact_1
      FROM public.users u
      LEFT JOIN public.extra_employee_info ex ON ex.employee_id = u.employee_id
      WHERE u.employee_id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  if (userResult.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'User account not found for employee.');
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  await pool.query(
    `
      UPDATE public.users
      SET password = $2,
          must_change_password = true,
          password_changed_at = NULL,
          updated_at = now()
      WHERE employee_id = $1
    `,
    [employeeId, hashedPassword]
  );

  return {
    tempPassword,
    whatsappPhone: userResult.rows[0]?.contact_1 || null,
  };
}
