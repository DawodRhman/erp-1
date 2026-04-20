import pool from '../config/db.js';
const employeeTable = {
    create: async (data) => {
        const { employee_id, name, father_name, cnic, date_of_birth } = data;

        const query = "INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth) VALUES ($1,$2,$3,$4,$5) RETURNING *"
        const resp = await pool.query(query, [employee_id, name, father_name, cnic, date_of_birth]);
        return resp.rows[0]


    },
    read: async (id) => {

        if (id) {
            const res = await pool.query('SELECT * FROM employee_info WHERE id = $1 ORDER BY employee_id ASC', [id]);
            return res.rows[0];
        }
        const res = await pool.query('SELECT * FROM employee_info ORDER BY employee_id ASC');
        return res.rows
    },
    readIds: async () => {
 
        const res = await pool.query('SELECT employee_id FROM employee_info ORDER BY employee_id ASC');
        return res.rows
    },
    update: async (data) => {
        const { id, employee_id, name, father_name, cnic, date_of_birth } = data
        const query = "UPDATE employee_info SET employee_id = $2,name = $3, father_name= $4, cnic= $5,date_of_birth=$6 ,updated_at = CURRENT_TIMESTAMP  WHERE id = $1 RETURNING *";
        const resp = await pool.query(query, [id, employee_id, name, father_name, cnic, date_of_birth]);
        return resp.rows[0];
    },
};
export default employeeTable;