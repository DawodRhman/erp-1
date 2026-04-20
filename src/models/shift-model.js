import pool from '../config/db.js';

const shiftTable = {
    create: async (data) => {
        const { name, start_time, end_time, late_after_minutes = 15, is_active = true } = data;
        const query = `
            INSERT INTO shifts (name, start_time, end_time, late_after_minutes, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const resp = await pool.query(query, [name, start_time, end_time, late_after_minutes, is_active]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
            return res.rows[0];
        }
        const res = await pool.query('SELECT * FROM shifts ORDER BY name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, name, start_time, end_time, late_after_minutes, is_active } = data;
        const query = `
            UPDATE shifts
            SET name = $2,
                start_time = $3,
                end_time = $4,
                late_after_minutes = $5,
                is_active = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [id, name, start_time, end_time, late_after_minutes, is_active]);
        return resp.rows[0];
    },

    findByName: async (name, excludeId = null) => {
        // Check for duplicate names (used before create/update)
        const query = excludeId
            ? 'SELECT * FROM shifts WHERE name = $1 AND id != $2'
            : 'SELECT * FROM shifts WHERE name = $1';
        const params = excludeId ? [name, excludeId] : [name];
        const res = await pool.query(query, params);
        return res.rows[0];
    },
};

export default shiftTable;
