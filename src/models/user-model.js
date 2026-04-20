// src/models/user-model.js
import pool from '../config/db.js';

const userTable = {
    create: async (data) => {
        const { email, password, employee_id, role_id } = data;
        const query = `
            INSERT INTO users (email, password, employee_id, role_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, employee_id, role_id, created_at
        `;
        const res = await pool.query(query, [email, password, employee_id, role_id]);
        return res.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query(
                `SELECT
                    u.id, u.email, u.employee_id,
                    u.role_id, r.role_name,
                    e.name as employee_name, u.created_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN employee_info e ON u.employee_id = e.employee_id
                WHERE u.id = $1`,
                [id]
            );
            return res.rows[0];
        }

        const res = await pool.query(
            `SELECT
                u.id, u.email, u.employee_id,
                u.role_id, r.role_name,
                e.name as employee_name, u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employee_info e ON u.employee_id = e.employee_id
            ORDER BY u.created_at DESC`
        );
        return res.rows;
    },

    updateRole: async (data) => {
        const { id, role_id } = data;
        const query = `
            UPDATE users
            SET role_id = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, employee_id, role_id
        `;
        const res = await pool.query(query, [id, role_id]);
        return res.rows[0];
    },

    checkEmail: async (email) => {
        const res = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        return res.rows[0];
    }
};

export default userTable;
