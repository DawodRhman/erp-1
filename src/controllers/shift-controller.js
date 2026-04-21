import shiftService from '../services/shift-service.js';

const shiftController = {
    getAll: async (req, res, next) => {
        try {
            const shifts = await shiftService.read();
            res.status(200).json(shifts);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const shift = await shiftService.read(req.params.id);
            if (!shift) {
                return res.status(404).json({ error: 'Shift not found' });
            }
            res.status(200).json(shift);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const shift = await shiftService.create(req.body);
            res.status(201).json({
                message: 'Shift created successfully',
                shift
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const shift = await shiftService.update({ id: req.params.id, ...req.body });
            if (!shift) {
                return res.status(404).json({ error: 'Shift not found' });
            }
            res.status(200).json({
                message: 'Shift updated successfully',
                shift
            });
        } catch (err) {
            next(err);
        }
    }
};

export default shiftController;
