import pool from '../config/db.js';

const designationTable = {
    create: async (data) => {
        const { title, department_id = null } = data;
        const query = 'INSERT INTO designations (title, department_id) VALUES ($1, $2) RETURNING *';
        const resp = await pool.query(query, [title, department_id]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const query = `
                SELECT d.*, dep.name AS department_name
                FROM designations d
                LEFT JOIN departments dep ON d.department_id = dep.id
                WHERE d.id = $1
            `;
            const res = await pool.query(query, [id]);
            return res.rows[0];
        }

        const query = `
            SELECT d.*, dep.name AS department_name
            FROM designations d
            LEFT JOIN departments dep ON d.department_id = dep.id
            ORDER BY dep.name ASC, d.title ASC
        `;
        const res = await pool.query(query);
        return res.rows;
    },

    readByDepartment: async (departmentId) => {
        const query = `
            SELECT d.*, dep.name AS department_name
            FROM designations d
            LEFT JOIN departments dep ON d.department_id = dep.id
            WHERE d.department_id = $1
            ORDER BY d.title ASC
        `;
        const res = await pool.query(query, [departmentId]);
        return res.rows;
    },

    update: async (data) => {
        const { id, title, department_id } = data;
        const query = 'UPDATE designations SET title = $2, department_id = $3 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, title, department_id]);
        return resp.rows[0];
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
