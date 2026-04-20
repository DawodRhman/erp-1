import pool from '../config/db.js';

const leavePolicyTable = {
    create: async (data) => {
        const { leave_type_id, days_allowed, year, is_active = true } = data;
        const query = `
            INSERT INTO leave_policies (leave_type_id, days_allowed, year, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const resp = await pool.query(query, [leave_type_id, days_allowed, year, is_active]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const query = `
                SELECT lp.*, lt.name as leave_type_name, lt.code as leave_type_code
                FROM leave_policies lp
                JOIN leave_types lt ON lp.leave_type_id = lt.id
                WHERE lp.id = $1
            `;
            const res = await pool.query(query, [id]);
            return res.rows[0];
        }
        const query = `
            SELECT lp.*, lt.name as leave_type_name, lt.code as leave_type_code
            FROM leave_policies lp
            JOIN leave_types lt ON lp.leave_type_id = lt.id
            ORDER BY lp.year DESC, lt.name ASC
        `;
        const res = await pool.query(query);
        return res.rows;
    },

    // Get policies for a specific year
    readByYear: async (year) => {
        const query = `
            SELECT lp.*, lt.name as leave_type_name, lt.code as leave_type_code
            FROM leave_policies lp
            JOIN leave_types lt ON lp.leave_type_id = lt.id
            WHERE lp.year = $1
            ORDER BY lt.name ASC
        `;
        const res = await pool.query(query, [year]);
        return res.rows;
    },

    update: async (data) => {
        const { id, leave_type_id, days_allowed, year, is_active } = data;
        const query = `
            UPDATE leave_policies
            SET leave_type_id = $2,
                days_allowed = $3,
                year = $4,
                is_active = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [id, leave_type_id, days_allowed, year, is_active]);
        return resp.rows[0];
    },

    // Check if policy exists for leave_type + year combo (for unique constraint)
    findByTypeAndYear: async (leave_type_id, year, excludeId = null) => {
        const query = excludeId
            ? 'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND year = $2 AND id != $3'
            : 'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND year = $2';
        const params = excludeId ? [leave_type_id, year, excludeId] : [leave_type_id, year];
        const res = await pool.query(query, params);
        return res.rows[0];
    },
};

export default leavePolicyTable;
