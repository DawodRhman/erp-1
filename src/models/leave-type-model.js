import pool from '../config/db.js';

const leaveTypeTable = {
    create: async (data) => {
        const { name, code, is_active = true } = data;
        const query = `
            INSERT INTO leave_types (name, code, is_active)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const resp = await pool.query(query, [name, code.toLowerCase(), is_active]);
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
        const { id, name, code, is_active } = data;
        const query = `
            UPDATE leave_types
            SET name = $2,
                code = $3,
                is_active = $4
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [id, name, code.toLowerCase(), is_active]);
        return resp.rows[0];
    },

    findByName: async (name, excludeId = null) => {
        const query = excludeId
            ? 'SELECT * FROM leave_types WHERE name = $1 AND id != $2'
            : 'SELECT * FROM leave_types WHERE name = $1';
        const params = excludeId ? [name, excludeId] : [name];
        const res = await pool.query(query, params);
        return res.rows[0];
    },

    findByCode: async (code, excludeId = null) => {
        const query = excludeId
            ? 'SELECT * FROM leave_types WHERE code = $1 AND id != $2'
            : 'SELECT * FROM leave_types WHERE code = $1';
        const params = excludeId ? [code.toLowerCase(), excludeId] : [code.toLowerCase()];
        const res = await pool.query(query, params);
        return res.rows[0];
    },
};

export default leaveTypeTable;
