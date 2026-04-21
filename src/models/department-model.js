import pool from '../config/db.js';

const departmentTable = {
    create: async (data) => {
        const { department_code, department_name } = data;
        const query = 'INSERT INTO departments (department_code, department_name) VALUES ($1, $2) RETURNING *';
        const resp = await pool.query(query, [department_code, department_name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM departments WHERE id = $1 ORDER BY id ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM departments ORDER BY department_name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, department_code, department_name } = data;
        const query = 'UPDATE departments SET department_code = $2, department_name = $3 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, department_code, department_name]);
        return resp.rows[0];
    },

};

export default departmentTable;
