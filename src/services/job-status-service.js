import jobStatusTable from '../models/job-status-model.js';

const jobStatusService = {
    create: (data) => jobStatusTable.create(data),
    read: (id) => jobStatusTable.read(id),
    update: (data) => jobStatusTable.update(data),
};

export default jobStatusService;
