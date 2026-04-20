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
        const { email, password, employee_id, role_id } = data;

        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // check email already taken
        const exists = await userTable.checkEmail(email);
        if (exists) throw new Error('Email already taken');

        // hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        return await userTable.create({
            email,
            password: hashedPassword,
            employee_id,
            role_id
        });
    },

    updateRole: async (id, role_id) => {
        const user = await userTable.updateRole({ id, role_id });
        if (!user) throw new Error('User not found');
        return user;
    }
};

export default userService;
