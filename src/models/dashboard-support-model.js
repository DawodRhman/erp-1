import pool from '../config/db.js'

const dashboardSupportModel = {
    readPendingActionCandidates: async () => {
        const result = await pool.query(
            `SELECT
                ei.employee_id,
                ei.name,
                ex.emergence_contact_1,
                ex.bank_name,
                ex.bank_acc_num,
                ex.perment_address,
                ex.postal_address
             FROM employee_info ei
             LEFT JOIN extra_employee_info ex ON ex.employee_id = ei.employee_id
             ORDER BY ei.employee_id ASC`
        )
        return result.rows
    },

    readUrgentAlerts: async ({ days }) => {
        const result = await pool.query(
            `SELECT
                ji.employee_id,
                ei.name,
                'probation_end'::text AS type,
                ji.probation_end_date AS due_date
             FROM job_info ji
             JOIN employee_info ei ON ei.employee_id = ji.employee_id
             WHERE ji.probation_end_date IS NOT NULL
               AND ji.probation_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int
             UNION ALL
             SELECT
                ji.employee_id,
                ei.name,
                'contract_end'::text AS type,
                ji.contract_end_date AS due_date
             FROM job_info ji
             JOIN employee_info ei ON ei.employee_id = ji.employee_id
             WHERE ji.contract_end_date IS NOT NULL
               AND ji.contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int
             ORDER BY due_date ASC, employee_id ASC`,
            [days]
        )
        return result.rows
    },
}

export default dashboardSupportModel
