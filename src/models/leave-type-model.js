import pool from '../config/db.js';

const leaveTypeTable = {
    create: async (data) => {
        const { name, is_active = true } = data;
        const query = `
            INSERT INTO leave_types (name, is_active)
            VALUES ($1, $2)
            RETURNING *
        `;
        const resp = await pool.query(query, [name, is_active]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const res = await pool.query('SELECT * FROM leave_types WHERE id = $1', [id]);
            return res.rows[0];
        }
        const res = await pool.query('SELECT * FROM leave_types ORDER BY name ASC');
        return res.rows;
    },

    update: async (data) => {
        const { id, name, is_active } = data;

        const fields = [];
        const values = [id];
        let idx = 2;

        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
        if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

        if (fields.length === 0) {
            const err = new Error('No fields provided to update.');
            err.status = 400;
            throw err;
        }

        const query = `
            UPDATE leave_types
            SET ${fields.join(', ')}
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, values);
        return resp.rows[0] ?? null;
    },

    findByName: async (name, excludeId = null) => {
        const query = excludeId
            ? 'SELECT * FROM leave_types WHERE name = $1 AND id != $2'
            : 'SELECT * FROM leave_types WHERE name = $1';
        const params = excludeId ? [name, excludeId] : [name];
        const res = await pool.query(query, params);
        return res.rows[0];
    },
};

export default leaveTypeTable;
