import leaveTypeService from '../services/leave-type-service.js';

const leaveTypeController = {
    getAll: async (req, res, next) => {
        try {
            const leaveTypes = await leaveTypeService.read();
            res.status(200).json(leaveTypes);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const leaveType = await leaveTypeService.read(req.params.id);
            if (!leaveType) {
                return res.status(404).json({ error: 'Leave type not found' });
            }
            res.status(200).json(leaveType);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const leaveType = await leaveTypeService.create(req.body);
            res.status(201).json({
                message: 'Leave type created successfully',
                leaveType
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const leaveType = await leaveTypeService.update({ id: req.params.id, ...req.body });
            if (!leaveType) {
                return res.status(404).json({ error: 'Leave type not found' });
            }
            res.status(200).json({
                message: 'Leave type updated successfully',
                leaveType
            });
        } catch (err) {
            next(err);
        }
    }
};

export default leaveTypeController;
