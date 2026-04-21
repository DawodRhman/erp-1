import leaveBalanceService from '../services/leave-balance-service.js';

const leaveBalanceController = {
    getAll: async (req, res, next) => {
        try {
            const balances = await leaveBalanceService.read();
            res.status(200).json(balances);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req, res, next) => {
        try {
            const balance = await leaveBalanceService.read(req.params.id);
            if (!balance) {
                return res.status(404).json({ error: 'Leave balance not found' });
            }
            res.status(200).json(balance);
        } catch (err) {
            next(err);
        }
    },

    getByEmployee: async (req, res, next) => {
        try {
            const { employeeId } = req.params;
            const { year } = req.query;
            const balances = await leaveBalanceService.readByEmployee(employeeId, year);
            res.status(200).json(balances);
        } catch (err) {
            next(err);
        }
    },

    getByYear: async (req, res, next) => {
        try {
            const balances = await leaveBalanceService.readByYear(req.params.year);
            res.status(200).json(balances);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const balance = await leaveBalanceService.create(req.body);
            res.status(201).json({
                message: 'Leave balance created successfully',
                balance
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const balance = await leaveBalanceService.update({ id: req.params.id, ...req.body });
            if (!balance) {
                return res.status(404).json({ error: 'Leave balance not found' });
            }
            res.status(200).json({
                message: 'Leave balance updated successfully',
                balance
            });
        } catch (err) {
            next(err);
        }
    },

    adjustUsed: async (req, res, next) => {
        try {
            const { adjustment } = req.body;
            if (adjustment === undefined) {
                return res.status(400).json({ error: 'Adjustment value is required' });
            }
            const balance = await leaveBalanceService.adjustUsed(req.params.id, adjustment);
            res.status(200).json({
                message: 'Leave balance adjusted successfully',
                balance
            });
        } catch (err) {
            next(err);
        }
    },

    initializeForEmployee: async (req, res, next) => {
        try {
            const { employeeId } = req.params;
            const { year } = req.body;
            if (!year) {
                return res.status(400).json({ error: 'Year is required' });
            }
            const balances = await leaveBalanceService.initializeForEmployee(employeeId, year);
            res.status(201).json({
                message: `${balances.length} leave balance(s) initialized`,
                balances
            });
        } catch (err) {
            next(err);
        }
    },
};

export default leaveBalanceController;
