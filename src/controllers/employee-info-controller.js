import employeeService from '../services/employee-info-service.js'

export const createEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.create(req.body)
        return res.status(201).json(employee)
    } catch (err) {
        return next(err)
    }
}

export const getEmployees = async (req, res, next) => {
    try {
        const { search } = req.query
        const data = search
            ? await employeeService.search(search)
            : await employeeService.readAll()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const getEmployeeById = async (req, res, next) => {
    try {
        const employee = await employeeService.readById(req.params.id)
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })
        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}

export const getEmployeesId = async (req, res, next) => {
    try {
        const data = await employeeService.readIds()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const updateEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.update({ id: req.params.id, ...req.body })
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })
        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}
