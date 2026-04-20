import employmentTypeService from '../services/employment-type-service.js';

export const createEmploymentType = async (req, res, next) => {
    try {
        const employmentType = await employmentTypeService.create(req.body);
        return res.status(201).json(employmentType);
    } catch (err) {
        return next(err);
    }
};

export const getEmploymentTypes = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await employmentTypeService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Employment type not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateEmploymentType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const employmentType = await employmentTypeService.update({ id, ...req.body });

        if (!employmentType) {
            return res.status(404).json({ error: 'Employment type not found' });
        }

        return res.status(200).json(employmentType);
    } catch (err) {
        return next(err);
    }
};
