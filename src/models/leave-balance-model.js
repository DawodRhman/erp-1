import pool from '../config/db.js';

const leaveBalanceTable = {
    create: async (data) => {
        const { employee_id, leave_type_id, year, total, used = 0 } = data;
        const remaining = total - used;
        const query = `
            INSERT INTO leave_balances (employee_id, leave_type_id, year, total, used, remaining)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const resp = await pool.query(query, [employee_id, leave_type_id, year, total, used, remaining]);
        return resp.rows[0];
    },

    read: async (id) => {
        if (id) {
            const query = `
                SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
                FROM leave_balances lb
                JOIN leave_types lt ON lb.leave_type_id = lt.id
                WHERE lb.id = $1
            `;
            const res = await pool.query(query, [id]);
            return res.rows[0];
        }
        const query = `
            SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            ORDER BY lb.employee_id, lb.year DESC, lt.name
        `;
        const res = await pool.query(query);
        return res.rows;
    },

    readByEmployee: async (employeeId, year = null) => {
        let query = `
            SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.employee_id = $1
        `;
        const params = [employeeId];

        if (year) {
            query += ' AND lb.year = $2';
            params.push(year);
        }
        query += ' ORDER BY lb.year DESC, lt.name';

        const res = await pool.query(query, params);
        return res.rows;
    },

    readByYear: async (year) => {
        const query = `
            SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_type_code
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.year = $1
            ORDER BY lb.employee_id, lt.name
        `;
        const res = await pool.query(query, [year]);
        return res.rows;
    },

    update: async (data) => {
        const { id, total, used } = data;
        const remaining = total - used;
        const query = `
            UPDATE leave_balances
            SET total = $2,
                used = $3,
                remaining = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [id, total, used, remaining]);
        return resp.rows[0];
    },

    // Used when leave is approved/cancelled to adjust used count
    adjustUsed: async (id, adjustment) => {
        const query = `
            UPDATE leave_balances
            SET used = used + $2,
                remaining = remaining - $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const resp = await pool.query(query, [id, adjustment]);
        return resp.rows[0];
    },

    findByEmployeeTypeYear: async (employeeId, leaveTypeId, year) => {
        const query = `
            SELECT * FROM leave_balances
            WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
        `;
        const res = await pool.query(query, [employeeId, leaveTypeId, year]);
        return res.rows[0];
    },
};

export default leaveBalanceTable;
