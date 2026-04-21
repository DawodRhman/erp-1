import leavePolicyTable from '../models/leave-policy-model.js';
import pool from '../config/db.js';

const leavePolicyService = {
    create: async (data) => {
        // Validate leave_type_id exists
        const leaveType = await pool.query(
            'SELECT * FROM leave_types WHERE id = $1',
            [data.leave_type_id]
        );
        if (leaveType.rows.length === 0) {
            throw { status: 400, message: 'Leave type not found' };
        }

        // Check unique constraint: leave_type + year
        const existing = await leavePolicyTable.findByTypeAndYear(data.leave_type_id, data.year);
        if (existing) {
            throw { status: 400, message: 'Policy already exists for this leave type and year' };
        }

        return leavePolicyTable.create(data);
    },

    read: (id) => leavePolicyTable.read(id),

    readByYear: (year) => leavePolicyTable.readByYear(year),

    update: async (data) => {
        // Validate leave_type_id exists
        const leaveType = await pool.query(
            'SELECT * FROM leave_types WHERE id = $1',
            [data.leave_type_id]
        );
        if (leaveType.rows.length === 0) {
            throw { status: 400, message: 'Leave type not found' };
        }

        // Check unique constraint excluding current record
        const existing = await leavePolicyTable.findByTypeAndYear(
            data.leave_type_id,
            data.year,
            data.id
        );
        if (existing) {
            throw { status: 400, message: 'Policy already exists for this leave type and year' };
        }

        return leavePolicyTable.update(data);
}}

export default leavePolicyService;
