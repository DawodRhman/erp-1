import leaveBalanceTable from '../models/leave-balance-model.js';
import pool from '../config/db.js';

const leaveBalanceService = {
    create: async (data) => {
        // Check employee exists
        const empCheck = await pool.query(
            'SELECT employee_id FROM employee_info WHERE employee_id = $1',
            [data.employee_id]
        );
        if (empCheck.rows.length === 0) {
            throw { status: 404, message: 'Employee not found' };
        }

        // Check leave type exists
        const typeCheck = await pool.query(
            'SELECT id FROM leave_types WHERE id = $1',
            [data.leave_type_id]
        );
        if (typeCheck.rows.length === 0) {
            throw { status: 404, message: 'Leave type not found' };
        }

        // Check unique constraint (employee + type + year)
        const existing = await leaveBalanceTable.findByEmployeeTypeYear(
            data.employee_id,
            data.leave_type_id,
            data.year
        );
        if (existing) {
            throw { status: 400, message: 'Balance already exists for this employee, leave type and year' };
        }

        return leaveBalanceTable.create(data);
    },

    read: (id) => leaveBalanceTable.read(id),

    readByEmployee: (employeeId, year) => leaveBalanceTable.readByEmployee(employeeId, year),

    readByYear: (year) => leaveBalanceTable.readByYear(year),

    update: async (data) => {
        // Validate used does not exceed total
        if (data.used > data.total) {
            throw { status: 400, message: 'Used days cannot exceed total days' };
        }
        return leaveBalanceTable.update(data);
    },

    adjustUsed: async (id, adjustment) => {
        // Get current balance
        const balance = await leaveBalanceTable.read(id);
        if (!balance) {
            throw { status: 404, message: 'Leave balance not found' };
        }

        // Validate adjustment
        const newUsed = balance.used + adjustment;
        if (newUsed < 0) {
            throw { status: 400, message: 'Used days cannot be negative' };
        }
        if (newUsed > balance.total) {
            throw { status: 400, message: 'Insufficient leave balance' };
        }

        return leaveBalanceTable.adjustUsed(id, adjustment);
    },

    // Initialize balances for employee based on leave policies for a year
    initializeForEmployee: async (employeeId, year) => {
        // Get all active policies for the year
        const policies = await pool.query(
            `SELECT lp.leave_type_id, lp.days_allowed
             FROM leave_policies lp
             WHERE lp.year = $1 AND lp.is_active = true`,
            [year]
        );

        const created = [];
        for (const policy of policies.rows) {
            // Check if balance already exists
            const existing = await leaveBalanceTable.findByEmployeeTypeYear(
                employeeId,
                policy.leave_type_id,
                year
            );
            if (!existing) {
                const balance = await leaveBalanceTable.create({
                    employee_id: employeeId,
                    leave_type_id: policy.leave_type_id,
                    year: year,
                    total: policy.days_allowed,
                    used: 0
                });
                created.push(balance);
            }
        }
        return created;
    },
};

export default leaveBalanceService;
