import jobInfoTable from '../models/job-info-model.js';

const jobInfoService = {
    create: (data) => jobInfoTable.create(data),
    read: (id) => jobInfoTable.read(id),
    readByEmployeeId: (employee_id) => jobInfoTable.readByEmployeeId(employee_id),
    update: (data) => jobInfoTable.update(data),
};

export default jobInfoService;
