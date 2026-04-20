import workModeService from '../services/work-mode-service.js';

export const createWorkMode = async (req, res, next) => {
    try {
        const workMode = await workModeService.create(req.body);
        return res.status(201).json(workMode);
    } catch (err) {
        return next(err);
    }
};

export const getWorkModes = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await workModeService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Work mode not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateWorkMode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const workMode = await workModeService.update({ id, ...req.body });

        if (!workMode) {
            return res.status(404).json({ error: 'Work mode not found' });
        }

        return res.status(200).json(workMode);
    } catch (err) {
        return next(err);
    }
};
