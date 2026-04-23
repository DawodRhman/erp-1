import pool from '../config/db.js';

const departmentTable = {
    create: async (data) => {
        const { department_code, department_name, parent_department_id = null } = data;
        const query = `
            INSERT INTO departments (department_code, department_name, parent_department_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const resp = await pool.query(query, [department_code, department_name, parent_department_id]);
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
        const { id, department_code, department_name, parent_department_id } = data;

        const fields = [];
        const values = [id];
        let idx = 2;

        if (department_code !== undefined) { fields.push(`department_code = $${idx++}`); values.push(department_code); }
        if (department_name !== undefined) { fields.push(`department_name = $${idx++}`); values.push(department_name); }
        if (parent_department_id !== undefined) { fields.push(`parent_department_id = $${idx++}`); values.push(parent_department_id); }

        if (fields.length === 0) {
            const err = new Error('No fields provided to update.');
            err.status = 400;
            throw err;
        }

        const query = `
            UPDATE departments
            SET ${fields.join(', ')}
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, values);
        return resp.rows[0] ?? null;
    },

};

export default departmentTable;
