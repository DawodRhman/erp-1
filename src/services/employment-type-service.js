import employmentTypeTable from '../models/employment-type-model.js';

const employmentTypeService = {
    create: (data) => employmentTypeTable.create(data),
    read: (id) => employmentTypeTable.read(id),
    update: (data) => employmentTypeTable.update(data),
};

export default employmentTypeService;
