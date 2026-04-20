import leavePolicyService from '../services/leave-policy-service.js';

const leavePolicyController = {
    getAll: async (req, res) => {
        try {
            const policies = await leavePolicyService.read();
            res.status(200).json(policies);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const policy = await leavePolicyService.read(req.params.id);
            if (!policy) {
                return res.status(404).json({ message: 'Leave policy not found' });
            }
            res.status(200).json(policy);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getByYear: async (req, res) => {
        try {
            const policies = await leavePolicyService.readByYear(req.params.year);
            res.status(200).json(policies);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const policy = await leavePolicyService.create(req.body);
            res.status(201).json({
                message: 'Leave policy created successfully',
                policy
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const policy = await leavePolicyService.update({ id: req.params.id, ...req.body });
            if (!policy) {
                return res.status(404).json({ message: 'Leave policy not found' });
            }
            res.status(200).json({
                message: 'Leave policy updated successfully',
                policy
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    }
};

export default leavePolicyController;
