import designationTable from '../models/designation-model.js';
import pool from '../config/db.js';

const designationService = {
    create: async (data) => {
        // Check for duplicate title
        const existing = await designationTable.findByTitle(data.title);
        if (existing) {
            throw { status: 400, message: 'Designation title already exists' };
        }

        // Validate department_id if provided
        if (data.department_id) {
            const deptCheck = await pool.query(
                'SELECT id FROM departments WHERE id = $1',
                [data.department_id]
            );
            if (deptCheck.rows.length === 0) {
                throw { status: 404, message: 'Department not found' };
            }
        }

        return designationTable.create(data);
    },

    read: (id) => designationTable.read(id),

    readByDepartment: (departmentId) => designationTable.readByDepartment(departmentId),

    update: async (data) => {
        // Check for duplicate title excluding current
        const existing = await designationTable.findByTitle(data.title, data.id);
        if (existing) {
            throw { status: 400, message: 'Designation title already exists' };
        }

        // Validate department_id if provided
        if (data.department_id) {
            const deptCheck = await pool.query(
                'SELECT id FROM departments WHERE id = $1',
                [data.department_id]
            );
            if (deptCheck.rows.length === 0) {
                throw { status: 404, message: 'Department not found' };
            }
        }

        return designationTable.update(data);
    },

};

export default designationService;
