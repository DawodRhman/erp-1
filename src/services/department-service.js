import departmentTable from '../models/department-model.js';

const departmentService = {
    create: (data) => departmentTable.create(data),
    read: (id) => departmentTable.read(id),
    update: (data) => departmentTable.update(data),
};

export default departmentService;
