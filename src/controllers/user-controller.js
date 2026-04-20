// src/controllers/user-controller.js
import userService from '../services/user-service.js';

const userController = {
    getAll: async (req, res, next) => {
        try {
            const users = await userService.getAll();
            res.status(200).json(users);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const user = await userService.getById(req.params.id);
            res.status(200).json(user);
        } catch (err) {
            err.status = 404;
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const user = await userService.create(req.body);
            res.status(201).json({
                message: 'User created successfully',
                user
            });
        } catch (err) {
            err.status = 400;
            next(err);
        }
    },

    updateRole: async (req, res, next) => {
        try {
            const { role_id } = req.body;

            if (!role_id) {
                return res.status(400).json({
                    error: 'role_id field is required'
                });
            }

            const user = await userService.updateRole(req.params.id, role_id);
            res.status(200).json({
                message: 'User role updated successfully',
                user
            });
        } catch (err) {
            err.status = 400;
            next(err);
        }
    }
};

export default userController;
