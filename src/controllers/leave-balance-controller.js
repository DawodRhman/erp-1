import leaveBalanceService from '../services/leave-balance-service.js';

const leaveBalanceController = {
    getAll: async (req, res) => {
        try {
            const balances = await leaveBalanceService.read();
            res.status(200).json(balances);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const balance = await leaveBalanceService.read(req.params.id);
            if (!balance) {
                return res.status(404).json({ message: 'Leave balance not found' });
            }
            res.status(200).json(balance);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getByEmployee: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { year } = req.query;
            const balances = await leaveBalanceService.readByEmployee(employeeId, year);
            res.status(200).json(balances);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getByYear: async (req, res) => {
        try {
            const balances = await leaveBalanceService.readByYear(req.params.year);
            res.status(200).json(balances);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const balance = await leaveBalanceService.create(req.body);
            res.status(201).json({
                message: 'Leave balance created successfully',
                balance
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const balance = await leaveBalanceService.update({ id: req.params.id, ...req.body });
            if (!balance) {
                return res.status(404).json({ message: 'Leave balance not found' });
            }
            res.status(200).json({
                message: 'Leave balance updated successfully',
                balance
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    adjustUsed: async (req, res) => {
        try {
            const { adjustment } = req.body;
            if (adjustment === undefined) {
                return res.status(400).json({ message: 'Adjustment value is required' });
            }
            const balance = await leaveBalanceService.adjustUsed(req.params.id, adjustment);
            res.status(200).json({
                message: 'Leave balance adjusted successfully',
                balance
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },

    initializeForEmployee: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { year } = req.body;
            if (!year) {
                return res.status(400).json({ message: 'Year is required' });
            }
            const balances = await leaveBalanceService.initializeForEmployee(employeeId, year);
            res.status(201).json({
                message: `${balances.length} leave balance(s) initialized`,
                balances
            });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ message: err.message });
        }
    },
};

export default leaveBalanceController;
