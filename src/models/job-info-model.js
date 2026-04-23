import pool from '../config/db.js'

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
    j.shift_id,
    j.date_of_joining,
    j.date_of_exit,
    j.created_at,
    j.updated_at,
    e.name AS employee_name,
    d.department_name,
    ds.title AS designation_title,
    et.type_name AS employment_type_name,
    js.status_name AS job_status_name,
    wm.mode_name AS work_mode_name,
    wl.location_name AS work_location_name,
    s.name AS shift_name,
    s.start_time AS shift_start_time,
    s.end_time AS shift_end_time,
    s.late_after_minutes
  FROM job_info j
  INNER JOIN employee_info e ON e.employee_id = j.employee_id
  INNER JOIN departments d ON d.id = j.department_id
  INNER JOIN designations ds ON ds.id = j.designation_id
  INNER JOIN employment_types et ON et.id = j.employment_type_id
  INNER JOIN job_statuses js ON js.id = j.job_status_id
  INNER JOIN work_modes wm ON wm.id = j.work_mode_id
  INNER JOIN work_locations wl ON wl.id = j.work_location_id
  INNER JOIN shifts s ON s.id = j.shift_id
`

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
      shift_id,
      date_of_joining,
      date_of_exit = null,
    } = data

    const resp = await pool.query(
      `
      INSERT INTO job_info
      (
        employee_id,
        department_id,
        designation_id,
        employment_type_id,
        job_status_id,
        work_mode_id,
        work_location_id,
        shift_id,
        date_of_joining,
        date_of_exit
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
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
      ]
    )
    return resp.rows[0] ?? null
  },

  read: async (id) => {
    if (id) {
      const res = await pool.query(`${baseSelect} WHERE j.id = $1 ORDER BY j.id ASC`, [id])
      return res.rows[0] ?? null
    }

    const res = await pool.query(`${baseSelect} ORDER BY j.employee_id ASC`)
    return res.rows
  },

  readByEmployeeId: async (employee_id) => {
    const res = await pool.query(`${baseSelect} WHERE j.employee_id = $1 ORDER BY j.employee_id ASC`, [employee_id])
    return res.rows
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
      shift_id,
      date_of_joining,
      date_of_exit = null,
    } = data

    const resp = await pool.query(
      `
      UPDATE job_info
      SET employee_id = $2,
          department_id = $3,
          designation_id = $4,
          employment_type_id = $5,
          job_status_id = $6,
          work_mode_id = $7,
          work_location_id = $8,
          shift_id = $9,
          date_of_joining = $10,
          date_of_exit = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
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
      ]
    )
    return resp.rows[0] ?? null
  },
}

export default jobInfoTable
