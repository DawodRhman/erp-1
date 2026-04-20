import employeeTable from '../models/employee-info-model.js'

const employeeService = {
    create: (data) => employeeTable.create(data),
    readAll: () => employeeTable.readAll(),
    readById: (id) => employeeTable.readById(id),
    readIds: () => employeeTable.readIds(),
    search: (term) => employeeTable.search(term),
    update: (data) => employeeTable.update(data),
}

export default employeeService
