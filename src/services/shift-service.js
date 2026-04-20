import shiftTable from '../models/shift-model.js';
import pool from '../config/db.js';

const shiftService = {
    create: async (data) => {
        const existing = await shiftTable.findByName(data.name);
        if (existing) {
            throw { status: 400, message: 'Shift name already exists' };
        }
        return shiftTable.create(data);
    },

    read: (id) => shiftTable.read(id),

    update: async (data) => {
        const existing = await shiftTable.findByName(data.name, data.id);
        if (existing) {
            throw { status: 400, message: 'Shift name already exists' };
        }
        return shiftTable.update(data);
    },

};

export default shiftService;
