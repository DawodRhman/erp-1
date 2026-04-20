import pool from '../config/db.js';

const employmentTypeTable = {
    create: async (data) => {
        const { type_name } = data;
        const query = 'INSERT INTO employment_types (type_name) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [type_name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM employment_types WHERE id = $1 ORDER BY type_name ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM employment_types ORDER BY type_name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, type_name } = data;
        const query = 'UPDATE employment_types SET type_name = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, type_name]);
        return resp.rows[0];
    },

};

export default employmentTypeTable;
