import pool from '../config/db.js'

const employeeTable = {
    create: async (data) => {
        const { employee_id, name, father_name, cnic, date_of_birth } = data
        const res = await pool.query(
            `INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [employee_id, name, father_name, cnic, date_of_birth]
        )
        return res.rows[0]
    },

    readAll: async () => {
        const res = await pool.query('SELECT * FROM employee_info ORDER BY employee_id ASC')
        return res.rows
    },

    readById: async (id) => {
        const res = await pool.query('SELECT * FROM employee_info WHERE id = $1', [id])
        return res.rows[0]
    },

    readIds: async () => {
        const res = await pool.query('SELECT employee_id FROM employee_info ORDER BY employee_id ASC')
        return res.rows
    },

    search: async (term) => {
        const res = await pool.query(
            `SELECT * FROM employee_info
             WHERE name ILIKE $1 OR employee_id ILIKE $1
             ORDER BY employee_id ASC`,
            [`%${term}%`]
        )
        return res.rows
    },

    update: async (data) => {
        const { id, employee_id, name, father_name, cnic, date_of_birth } = data
        const res = await pool.query(
            `UPDATE employee_info
             SET employee_id = $2, name = $3, father_name = $4, cnic = $5,
                 date_of_birth = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, employee_id, name, father_name, cnic, date_of_birth]
        )
        return res.rows[0]
    },
}

export default employeeTable
