import leavePolicyService from '../services/leave-policy-service.js';

const leavePolicyController = {
    getAll: async (req, res, next) => {
        try {
            const policies = await leavePolicyService.read();
            res.status(200).json(policies);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const policy = await leavePolicyService.read(req.params.id);
            if (!policy) {
                return res.status(404).json({ error: 'Leave policy not found' });
            }
            res.status(200).json(policy);
        } catch (err) {
            next(err);
        }
    },

    getByYear: async (req, res, next) => {
        try {
            const policies = await leavePolicyService.readByYear(req.params.year);
            res.status(200).json(policies);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const policy = await leavePolicyService.create(req.body);
            res.status(201).json({
                message: 'Leave policy created successfully',
                policy
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const policy = await leavePolicyService.update({ id: req.params.id, ...req.body });
            if (!policy) {
                return res.status(404).json({ error: 'Leave policy not found' });
            }
            res.status(200).json({
                message: 'Leave policy updated successfully',
                policy
            });
        } catch (err) {
            next(err);
        }
    }
};

export default leavePolicyController;
