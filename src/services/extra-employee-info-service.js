import extraEmployeeInfoTable from '../models/extra-employee-info-model.js';

const extraEmployeeInfoService = {
    create: (data) => extraEmployeeInfoTable.create(data),
    read: () => extraEmployeeInfoTable.read(),
    readByEmployeeId: (employee_id) => extraEmployeeInfoTable.readByEmployeeId(employee_id),
    update: (data) => extraEmployeeInfoTable.update(data) 
};

export default extraEmployeeInfoService;
