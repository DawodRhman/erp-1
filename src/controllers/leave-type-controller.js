import leaveTypeService from '../services/leave-type-service.js';

const leaveTypeController = {
    getAll: async (req, res) => {
        try {
            const leaveTypes = await leaveTypeService.read();
            res.status(200).json(leaveTypes);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const leaveType = await leaveTypeService.read(req.params.id);
            if (!leaveType) {
                return res.status(404).json({ message: 'Leave type not found' });
            }
            res.status(200).json(leaveType);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const leaveType = await leaveTypeService.create(req.body);
            res.status(201).json({
                message: 'Leave type created successfully',
                leaveType
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const leaveType = await leaveTypeService.update({ id: req.params.id, ...req.body });
            if (!leaveType) {
                return res.status(404).json({ message: 'Leave type not found' });
            }
            res.status(200).json({
                message: 'Leave type updated successfully',
                leaveType
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    }
};

export default leaveTypeController;
