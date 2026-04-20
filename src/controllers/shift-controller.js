import shiftService from '../services/shift-service.js';

const shiftController = {
    getAll: async (req, res) => {
        try {
            const shifts = await shiftService.read();
            res.status(200).json(shifts);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const shift = await shiftService.read(req.params.id);
            if (!shift) {
                return res.status(404).json({ message: 'Shift not found' });
            }
            res.status(200).json(shift);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const shift = await shiftService.create(req.body);
            res.status(201).json({
                message: 'Shift created successfully',
                shift
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const shift = await shiftService.update({ id: req.params.id, ...req.body });
            if (!shift) {
                return res.status(404).json({ message: 'Shift not found' });
            }
            res.status(200).json({
                message: 'Shift updated successfully',
                shift
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    }
};

export default shiftController;
