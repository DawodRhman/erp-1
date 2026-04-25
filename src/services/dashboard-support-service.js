import dashboardSupportModel from '../models/dashboard-support-model.js'

const requiredPendingFields = [
    ['emergence_contact_1', 'emergency_contact'],
    ['bank_name', 'bank_name'],
    ['bank_acc_num', 'bank_account'],
    ['perment_address', 'permanent_address'],
    ['postal_address', 'postal_address'],
]

const isMissing = (value) => value === null || value === undefined || `${value}`.trim() === ''

const dashboardSupportService = {
    readPendingActions: async () => {
        const rows = await dashboardSupportModel.readPendingActionCandidates()

        return rows
            .map((row) => {
                const missing_fields = requiredPendingFields
                    .filter(([field]) => isMissing(row[field]))
                    .map(([, label]) => label)

                return {
                    employee_id: row.employee_id,
                    name: row.name,
                    missing_fields,
                    status: 'open',
                }
            })
            .filter((row) => row.missing_fields.length > 0)
    },

    readUrgentAlerts: async ({ days }) => {
        const rows = await dashboardSupportModel.readUrgentAlerts({ days })
        return rows.map((row) => ({
            employee_id: row.employee_id,
            name: row.name,
            type: row.type,
            due_date: row.due_date,
            status: 'open',
        }))
    },
}

export default dashboardSupportService
