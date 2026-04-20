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
