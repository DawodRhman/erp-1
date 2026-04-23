import pool from '../config/db.js';

const extraEmployeeInfoTable = {
    create: async (data) => {
        const {
            employee_id,
            contact_1,
            contact_2 = null,
            emergence_contact_1 = null,
            emergence_contact_2,
            bank_name = null,
            bank_acc_num = null,
            perment_address,
            postal_address,            
        } = data;

        const query = `
      INSERT INTO extra_employee_info
      (employee_id, contact_1, contact_2, emergence_contact_1, emergence_contact_2,
       bank_name, bank_acc_num, perment_address, postal_address )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;
        const resp = await pool.query(query, [
            employee_id,
            contact_1,
            contact_2,
            emergence_contact_1,
            emergence_contact_2,
            bank_name,
            bank_acc_num,
            perment_address,
            postal_address,
            
        ]);
        return resp.rows[0];
    },

    read: async () => {
        const res = await pool.query('SELECT * FROM employee_info e LEFT JOIN extra_employee_info ex USING (employee_id) ORDER BY e.employee_id ASC;');
        return res.rows;
    },

    readByEmployeeId: async (employee_id) => {
        const res = await pool.query(
            'SELECT * FROM employee_info e LEFT JOIN extra_employee_info ex USING (employee_id) WHERE e.employee_id = $1 ORDER BY e.employee_id ASC;',
            [employee_id]
        );
        return res.rows;
    },

    update: async (data) => {
        const {
            id,
            employee_id,
            contact_1,
            contact_2 = null,
            emergence_contact_1 = null,
            emergence_contact_2 ,
            bank_name = null,
            bank_acc_num = null,
            perment_address,
            postal_address,
        } = data;

        const query = `
      UPDATE extra_employee_info
      SET employee_id = $2,
          contact_1 = $3,
          contact_2 = $4,
          emergence_contact_1 = $5,
          emergence_contact_2 = $6,
          bank_name = $7,
          bank_acc_num = $8,
          perment_address = $9,
          postal_address = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const resp = await pool.query(query, [
            id,
            employee_id,
            contact_1,
            contact_2,
            emergence_contact_1,
            emergence_contact_2,
            bank_name,
            bank_acc_num,
            perment_address,
            postal_address
        ]);
        return resp.rows[0];
    },

    
};

export default extraEmployeeInfoTable;
