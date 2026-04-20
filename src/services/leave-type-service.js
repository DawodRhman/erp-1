import leaveTypeTable from '../models/leave-type-model.js';
import pool from '../config/db.js';

const leaveTypeService = {
    create: async (data) => {
        const existingName = await leaveTypeTable.findByName(data.name);
        if (existingName) {
            throw { status: 400, message: 'Leave type name already exists' };
        }
        const existingCode = await leaveTypeTable.findByCode(data.code);
        if (existingCode) {
            throw { status: 400, message: 'Leave type code already exists' };
        }
        return leaveTypeTable.create(data);
    },

    read: (id) => leaveTypeTable.read(id),

    update: async (data) => {
        const existingName = await leaveTypeTable.findByName(data.name, data.id);
        if (existingName) {
            throw { status: 400, message: 'Leave type name already exists' };
        }
        const existingCode = await leaveTypeTable.findByCode(data.code, data.id);
        if (existingCode) {
            throw { status: 400, message: 'Leave type code already exists' };
        }
        return leaveTypeTable.update(data);
    },

};

export default leaveTypeService;
