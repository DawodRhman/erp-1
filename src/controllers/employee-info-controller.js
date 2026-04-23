// Employee information controller - handles CRUD operations for employee data
import employeeService from '../services/employee-info-service.js'

// Create new employee record in employee_info table
export const createEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.create(req.body)
        return res.status(201).json(employee)
    } catch (err) {
        return next(err)
    }
}

// Get employees list - returns all for HR, only self for employees
export const getEmployees = async (req, res, next) => {
    try {
        // Check if employee role - only return self
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            // Employee role - return only their own data
            const data = await employeeService.readByEmployeeId(req.user.employee_id)
            return res.status(200).json(data ? [data] : [])
        }

        // HR or Admin - return all
        const { search } = req.query
        const data = search
            ? await employeeService.search(search)
            : await employeeService.readAll()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

// Get single employee by ID - enforces self-service for employee role
export const getEmployeeById = async (req, res, next) => {
    try {
        // :id is employee_info.id (UUID)
        const employee = await employeeService.readById(req.params.id)
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })

        // Self-service enforcement for employee role
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            if (employee.employee_id !== req.user.employee_id) {
                return res.status(403).json({
                    error: 'Access denied. You can only access your own data.'
                })
            }
        }

        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}

// Get all employee IDs only - for dropdowns and lookups
export const getEmployeesId = async (req, res, next) => {
    try {
        // Employees must not see the full company employee_id list (privacy + enumeration risk)
        if (!req.user.is_super_admin &&
            req.user.role !== 'hr_manager' &&
            req.user.role !== 'hr_executive') {
            return res.status(403).json({ error: 'Access denied.' })
        }

        const data = await employeeService.readIds()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

// Update employee record - HR and Admin only
export const updateEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.update({ id: req.params.id, ...req.body })
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })
        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}
