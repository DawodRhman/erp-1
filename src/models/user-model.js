// src/models/user-model.js
import pool from '../config/db.js';

const userTable = {
    create: async (data) => {
        const { username, password, employee_id } = data;
        const query = `
            INSERT INTO users (username, password, employee_id) 
            VALUES ($1, $2, $3) 
            RETURNING id, username, role, is_active, employee_id, created_at
        `;
        const res = await pool.query(query, [username, password, employee_id]);
        return res.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query(
                `SELECT 
                    u.id, u.username, u.role, u.is_active,
                    u.employee_id, e.name as employee_name, u.created_at
                FROM users u
                LEFT JOIN employee_info e ON u.employee_id = e.employee_id
                WHERE u.id = $1`,
                [id]
            );
            return res.rows[0];
        }

        const res = await pool.query(
            `SELECT 
                u.id, u.username, u.role, u.is_active,
                u.employee_id, e.name as employee_name, u.created_at
            FROM users u
            LEFT JOIN employee_info e ON u.employee_id = e.employee_id
            ORDER BY u.created_at DESC`
        );
        return res.rows;
    },

    updateStatus: async (data) => {
        const { id, is_active } = data;
        const query = `
            UPDATE users 
            SET is_active = $2, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING id, username, role, is_active
        `;
        const res = await pool.query(query, [id, is_active]);
        return res.rows[0];
    },

    checkUsername: async (username) => {
        const res = await pool.query(
            `SELECT id FROM users WHERE username = $1`,
            [username]
        );
        return res.rows[0];
    }
};

export default userTable;