import designationService from '../services/designation-service.js';

const designationController = {
    getAll: async (req, res, next) => {
        try {
            const designations = await designationService.read();
            res.status(200).json(designations);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const designation = await designationService.read(req.params.id);
            if (!designation) {
                return res.status(404).json({ error: 'Designation not found' });
            }
            res.status(200).json(designation);
        } catch (err) {
            next(err);
        }
    },

    getByDepartment: async (req, res, next) => {
        try {
            const designations = await designationService.readByDepartment(req.params.departmentId);
            res.status(200).json(designations);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const designation = await designationService.create(req.body);
            res.status(201).json({
                message: 'Designation created successfully',
                designation
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const designation = await designationService.update({ id: req.params.id, ...req.body });
            if (!designation) {
                return res.status(404).json({ error: 'Designation not found' });
            }
            res.status(200).json({
                message: 'Designation updated successfully',
                designation
            });
        } catch (err) {
            next(err);
        }
    }
};

export default designationController;
