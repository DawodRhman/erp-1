import designationTable from '../models/designation-model.js';
import pool from '../config/db.js';

const designationService = {
    create: async (data) => {
        // Check for duplicate title
        const existing = await designationTable.findByTitle(data.title);
        if (existing) {
            throw { status: 400, message: 'Designation title already exists' };
        }

        return designationTable.create(data);
    },

    read: (id) => designationTable.read(id),

    readByDepartment: (departmentId) => designationTable.readByDepartment(departmentId),

    update: async (data) => {
        if (data.title === undefined && data.is_active === undefined) {
            throw { status: 400, message: 'No fields provided to update.' };
        }

        // Check for duplicate title excluding current
        if (data.title !== undefined) {
            const existing = await designationTable.findByTitle(data.title, data.id);
            if (existing) {
                throw { status: 400, message: 'Designation title already exists' };
            }
        }

        return designationTable.update(data);
    },

};

export default designationService;
