import pool from '../config/db.js';

const jobStatusTable = {
    create: async (data) => {
        const { status_name } = data;
        const query = 'INSERT INTO job_statuses (status_name) VALUES ($1) RETURNING *';
        const resp = await pool.query(query, [status_name]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM job_statuses WHERE id = $1 ORDER BY status_name ASC', [id]);
            return res.rows[0];
        }

        const res = await pool.query('SELECT * FROM job_statuses ORDER BY status_name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, status_name } = data;
        const query = 'UPDATE job_statuses SET status_name = $2 WHERE id = $1 RETURNING *';
        const resp = await pool.query(query, [id, status_name]);
        return resp.rows[0];
    },

};

export default jobStatusTable;
