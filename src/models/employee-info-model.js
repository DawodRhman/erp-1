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

    readByEmployeeId: async (employee_id) => {
        const res = await pool.query('SELECT * FROM employee_info WHERE employee_id = $1', [employee_id])
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

        const fields = []
        const values = [id]
        let idx = 2

        if (employee_id !== undefined) { fields.push(`employee_id = $${idx++}`); values.push(employee_id) }
        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name) }
        if (father_name !== undefined) { fields.push(`father_name = $${idx++}`); values.push(father_name) }
        if (cnic !== undefined) { fields.push(`cnic = $${idx++}`); values.push(cnic) }
        if (date_of_birth !== undefined) { fields.push(`date_of_birth = $${idx++}`); values.push(date_of_birth) }

        if (fields.length === 0) {
            const err = new Error('No fields provided to update.')
            err.status = 400
            throw err
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`)

        const res = await pool.query(
            `UPDATE employee_info
             SET ${fields.join(', ')}
             WHERE id = $1
             RETURNING *`,
            values
        )
        return res.rows[0]
    },
}

export default employeeTable
