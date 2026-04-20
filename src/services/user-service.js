// src/services/user-service.js
import bcrypt from 'bcrypt';
import userTable from '../models/user-model.js';

const userService = {
    getAll: async () => {
        return await userTable.read();
    },

    getById: async (id) => {
        const user = await userTable.read(id);
        if (!user) throw new Error('User not found');
        return user;
    },

    create: async (data) => {
        const { username, password, employee_id } = data;

        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        // check username already taken
        const exists = await userTable.checkUsername(username);
        if (exists) throw new Error('Username already taken');

        // hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        return await userTable.create({
            username,
            password: hashedPassword,
            employee_id
        });
    },

    updateStatus: async (id, is_active) => {
        const user = await userTable.updateStatus({ id, is_active });
        if (!user) throw new Error('User not found');
        return user;
    }
};

export default userService;