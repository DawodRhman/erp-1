import pool from '../config/db.js';

const designationTable = {
    create: async (data) => {
        const { title } = data;
        const query = 'INSERT INTO designations (title) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [title]);
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

    update: async (data) => {
        const { id, title } = data;
        const query = 'UPDATE designations SET title = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, title]);
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
