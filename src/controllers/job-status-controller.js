import jobStatusService from '../services/job-status-service.js';

export const createJobStatus = async (req, res, next) => {
    try {
        const jobStatus = await jobStatusService.create(req.body);
        return res.status(201).json(jobStatus);
    } catch (err) {
        return next(err);
    }
};

export const getJobStatuses = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await jobStatusService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Job status not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateJobStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const jobStatus = await jobStatusService.update({ id, ...req.body });

        if (!jobStatus) {
            return res.status(404).json({ error: 'Job status not found' });
        }

        return res.status(200).json(jobStatus);
    } catch (err) {
        return next(err);
    }
};
