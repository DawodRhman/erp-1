import pool from '../config/db.js';

const workModeTable = {
    create: async (data) => {
        const { mode_name } = data;
        const query = 'INSERT INTO work_modes (mode_name) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [mode_name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM work_modes WHERE id = $1 ORDER BY mode_name ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM work_modes ORDER BY mode_name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, mode_name } = data;
        const query = 'UPDATE work_modes SET mode_name = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, mode_name]);
        return resp.rows[0];
    },

};

export default workModeTable;
