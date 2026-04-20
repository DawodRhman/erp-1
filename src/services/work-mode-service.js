import workModeTable from '../models/work-mode-model.js';

const workModeService = {
    create: (data) => workModeTable.create(data),
    read: (id) => workModeTable.read(id),
    update: (data) => workModeTable.update(data),
};

export default workModeService;
