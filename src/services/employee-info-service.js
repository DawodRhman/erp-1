import employeeTable from '../models/employee-info-model.js';

const employeeService = {
    create: (data) => employeeTable.create(data),
    read: (id) => employeeTable.read(id),
    readIds: () => employeeTable.readIds(),
    update: (data) => employeeTable.update(data),
};

export default employeeService;
