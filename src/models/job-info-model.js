import pool from '../config/db.js';
const baseSelect = `
  SELECT
    j.id,
    j.employee_id,
    j.department_id,
    j.designation_id,
    j.employment_type_id,
    j.job_status_id,
    j.work_mode_id,
    j.work_location_id,
    j.reporting_manager_id,
    j.shift_timing,
    j.date_of_joining,
    j.date_of_exit,
    j.created_at,
    j.updated_at,
    e.name AS employee_name,
    d.name AS department_name,
    ds.title AS designation_title,
    et.type_name AS employment_type_name,
    js.status_name AS job_status_name,
    wm.mode_name AS work_mode_name,
    wl.location_name AS work_location_name,
    rm.manager_name AS reporting_manager_name
  FROM job_info j
  INNER JOIN employee_info e ON e.employee_id = j.employee_id
  INNER JOIN departments d ON d.id = j.department_id
  INNER JOIN designations ds ON ds.id = j.designation_id
  INNER JOIN employment_types et ON et.id = j.employment_type_id
  INNER JOIN job_statuses js ON js.id = j.job_status_id
  INNER JOIN work_modes wm ON wm.id = j.work_mode_id
  INNER JOIN work_locations wl ON wl.id = j.work_location_id
  INNER JOIN reporting_managers rm ON rm.id = j.reporting_manager_id
`;

const jobInfoTable = {
    create: async (data) => {
        const {
            employee_id,
            department_id,
            designation_id,
            employment_type_id,
            job_status_id,
            work_mode_id,
            work_location_id,
            reporting_manager_id,
            shift_timing = null,
            date_of_joining,
            date_of_exit = null,
        } = data;

        const query = `
            INSERT INTO job_info
            (
                employee_id,
                department_id,
                designation_id,
                employment_type_id,
                job_status_id,
                work_mode_id,
                work_location_id,
                reporting_manager_id,
                 shift_timing,
                date_of_joining,
                date_of_exit
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
        `;
        const resp = await pool.query(query, [
            employee_id,
            department_id,
            designation_id,
            employment_type_id,
            job_status_id,
            work_mode_id,
            work_location_id,
            reporting_manager_id,
            shift_timing,
            date_of_joining,
            date_of_exit,
        ]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query(`${baseSelect} WHERE j.id = $1 ORDER BY j.id ASC`, [id]);
            return res.rows[0];
        }

        const res = await pool.query(`${baseSelect} ORDER BY j.employee_id ASC`);
        return res.rows;
    },

    update: async (data) => {
        const {
            id,
            employee_id,
            department_id,
            designation_id,
            employment_type_id,
            job_status_id,
            work_mode_id,
            work_location_id,
            reporting_manager_id,
            shift_timing = null,
            date_of_joining,
            date_of_exit = null,
        } = data;

        const query = `
            UPDATE job_info
            SET employee_id = $2,
                department_id = $3,
                designation_id = $4,
                employment_type_id = $5,
                job_status_id = $6,
                work_mode_id = $7,
                work_location_id = $8,
                reporting_manager_id = $9,
                shift_timing = $10,
                date_of_joining = $11,
                date_of_exit = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [
            id,
            employee_id,
            department_id,
            designation_id,
            employment_type_id,
            job_status_id,
            work_mode_id,
            work_location_id,
            reporting_manager_id,
            shift_timing,
            date_of_joining,
            date_of_exit,
        ]);
        return resp.rows[0];
    },

};

export default jobInfoTable;
