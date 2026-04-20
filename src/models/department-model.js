import pool from '../config/db.js';

const departmentTable = {
    create: async (data) => {
        const { name } = data;
        const query = 'INSERT INTO departments (name) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM departments WHERE id = $1 ORDER BY id ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, name } = data;
        const query = 'UPDATE departments SET name = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, name]);
        return resp.rows[0];
    },

};

export default departmentTable;
