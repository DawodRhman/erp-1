import pool from '../config/db.js'

const authTable = {
    findByEmail: async (email) => {
        const res = await pool.query(
            `SELECT u.id, u.employee_id, u.email, u.password, u.role_id,
                    r.role_name, r.department_id
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.email = $1`,
            [email]
        )
        return res.rows[0]
    }
}

export default authTable
