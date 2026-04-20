// src/controllers/user-controller.js
import userService from '../services/user-service.js';

const userController = {
    getAll: async (req, res) => {
        try {
            const users = await userService.getAll();
            res.status(200).json(users);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const user = await userService.getById(req.params.id);
            res.status(200).json(user);
        } catch (err) {
            res.status(404).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const user = await userService.create(req.body);
            res.status(201).json({
                message: 'HR account created successfully',
                user
            });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { is_active } = req.body;

            if (is_active === undefined) {
                return res.status(400).json({
                    message: 'is_active field is required'
                });
            }

            const user = await userService.updateStatus(req.params.id, is_active);
            res.status(200).json({
                message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
                user
            });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
};

export default userController;   