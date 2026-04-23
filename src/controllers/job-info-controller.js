import jobInfoService from '../services/job-info-service.js';

export const createJobInfo = async (req, res, next) => {
    try {
        const jobInfo = await jobInfoService.create(req.body);
        return res.status(201).json(jobInfo);
    } catch (err) {
        return next(err);
    }
};

export const getJobInfo = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Self-service: employees can only access their own job info
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            if (id) {
                const row = await jobInfoService.read(id);
                if (!row) {
                    return res.status(404).json({ error: 'Job info not found' });
                }
                if (row.employee_id !== req.user.employee_id) {
                    return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
                }
                return res.status(200).json(row);
            }

            const rows = await jobInfoService.readByEmployeeId(req.user.employee_id);
            return res.status(200).json(rows);
        }

        const data = await jobInfoService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Job info not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateJobInfo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const jobInfo = await jobInfoService.update({ id, ...req.body });

        if (!jobInfo) {
            return res.status(404).json({ error: 'Job info not found' });
        }

        return res.status(200).json(jobInfo);
    } catch (err) {
        return next(err);
    }
};
