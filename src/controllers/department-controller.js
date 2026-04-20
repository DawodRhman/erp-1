import departmentService from '../services/department-service.js';

export const createDepartment = async (req, res, next) => {
    try {
        const department = await departmentService.create(req.body);
        return res.status(201).json(department);
    } catch (err) {
        return next(err);
    }
};

export const getDepartments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await departmentService.read(id);

        if (id && !data) {
            return res.status(404).json({ error: 'Department not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        return next(err);
    }
};

export const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const department = await departmentService.update({ id, ...req.body });

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        return res.status(200).json(department);
    } catch (err) {
        return next(err);
    }
};

