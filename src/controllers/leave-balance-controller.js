import leaveBalanceService from '../services/leave-balance-service.js';

const leaveBalanceController = {
    getAll: async (req, res, next) => {
        try {
            // Self-service: employees only see their own balances
            if (!req.user.is_super_admin &&
                req.user.role !== 'hr_manager' &&
                req.user.role !== 'hr_executive') {
                const balances = await leaveBalanceService.readByEmployee(req.user.employee_id, req.query.year);
                return res.status(200).json(balances);
            }

            const balances = await leaveBalanceService.read();
            return res.status(200).json(balances);
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
            // Self-service: employees can only access their own balance row
            if (!req.user.is_super_admin &&
                req.user.role !== 'hr_manager' &&
                req.user.role !== 'hr_executive') {
                if (balance.employee_id !== req.user.employee_id) {
                    return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
                }
            }
            res.status(200).json(balance);
        } catch (err) {
            next(err);
        }
    },

    getByEmployee: async (req, res, next) => {
        try {
            let { employeeId } = req.params;
            const { year } = req.query;

            // Self-service: force employeeId to self
            if (!req.user.is_super_admin &&
                req.user.role !== 'hr_manager' &&
                req.user.role !== 'hr_executive') {
                employeeId = req.user.employee_id;
            }

            const balances = await leaveBalanceService.readByEmployee(employeeId, year);
            res.status(200).json(balances);
        } catch (err) {
            next(err);
        }
    },

    getByYear: async (req, res, next) => {
        try {
            // Self-service: employees cannot enumerate other balances by year
            if (!req.user.is_super_admin &&
                req.user.role !== 'hr_manager' &&
                req.user.role !== 'hr_executive') {
                return res.status(403).json({ error: 'Access denied.' });
            }
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
