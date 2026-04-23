import pool from '../config/db.js';

const designationTable = {
    create: async (data) => {
        const { title, is_active = true } = data;
        const query = 'INSERT INTO designations (title, is_active) VALUES ($1, $2) RETURNING *';
        const resp = await pool.query(query, [title, is_active]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM designations WHERE id = $1', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM designations ORDER BY title ASC');
        return res.rows;
    },

    // The schema doesn't store department_id on designations. We derive "department designations"
    // from job_info usage so the API can still provide department-scoped lists.
    readByDepartment: async (departmentId) => {
        const res = await pool.query(
            `
            SELECT DISTINCT d.*
            FROM designations d
            JOIN job_info j ON j.designation_id = d.id
            WHERE j.department_id = $1
            ORDER BY d.title ASC
            `,
            [departmentId]
        )
        return res.rows
    },

    update: async (data) => {
        const { id, title, is_active } = data;

        const fields = [];
        const values = [id];
        let idx = 2;

        if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
        if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

        if (fields.length === 0) {
            const err = new Error('No fields provided to update.');
            err.status = 400;
            throw err;
        }

        const query = `UPDATE designations SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
        const resp = await pool.query(query, values);
        return resp.rows[0] ?? null;
    },

    findByTitle: async (title, excludeId = null) => {
        const query = excludeId
            ? 'SELECT * FROM designations WHERE title = $1 AND id != $2'
            : 'SELECT * FROM designations WHERE title = $1';
        const params = excludeId ? [title, excludeId] : [title];
        const res = await pool.query(query, params);
        return res.rows[0];
    },
};

export default designationTable;
