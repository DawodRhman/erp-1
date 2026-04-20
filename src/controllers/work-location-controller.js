import workLocationService from '../services/work-location-service.js';

export const createWorkLocation = async (req, res, next) => {
    try {
        const workLocation = await workLocationService.create(req.body);
        return res.status(201).json(workLocation);
    } catch (err) {
        return next(err);
    }
};

export const getWorkLocations = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await workLocationService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Work location not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateWorkLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const workLocation = await workLocationService.update({ id, ...req.body });

        if (!workLocation) {
            return res.status(404).json({ error: 'Work location not found' });
        }

        return res.status(200).json(workLocation);
    } catch (err) {
        return next(err);
    }
};
