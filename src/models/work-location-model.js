import pool from '../config/db.js';

const workLocationTable = {
    create: async (data) => {
        const { location_name } = data;
        const query = 'INSERT INTO work_locations (location_name) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [location_name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM work_locations WHERE id = $1 ORDER BY location_name ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM work_locations ORDER BY location_name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, location_name } = data;
        const query = 'UPDATE work_locations SET location_name = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, location_name]);
        return resp.rows[0];
    },

};

export default workLocationTable;
