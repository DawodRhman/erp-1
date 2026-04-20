import designationService from '../services/designation-service.js';

const designationController = {
    getAll: async (req, res) => {
        try {
            const designations = await designationService.read();
            res.status(200).json(designations);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const designation = await designationService.read(req.params.id);
            if (!designation) {
                return res.status(404).json({ message: 'Designation not found' });
            }
            res.status(200).json(designation);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getByDepartment: async (req, res) => {
        try {
            const designations = await designationService.readByDepartment(req.params.departmentId);
            res.status(200).json(designations);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const designation = await designationService.create(req.body);
            res.status(201).json({
                message: 'Designation created successfully',
                designation
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const designation = await designationService.update({ id: req.params.id, ...req.body });
            if (!designation) {
                return res.status(404).json({ message: 'Designation not found' });
            }
            res.status(200).json({
                message: 'Designation updated successfully',
                designation
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

};

export default designationController;
