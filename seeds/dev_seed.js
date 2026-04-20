import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Clear existing data (reverse dependency order)
        await client.query("DELETE FROM users");
        await client.query("DELETE FROM job_info");
        await client.query("DELETE FROM extra_employee_info");
        await client.query("DELETE FROM employee_info");
        await client.query("DELETE FROM roles");
        await client.query("DELETE FROM leave_types");
        await client.query("DELETE FROM shifts");
        await client.query("DELETE FROM work_locations");
        await client.query("DELETE FROM work_modes");
        await client.query("DELETE FROM job_statuses");
        await client.query("DELETE FROM employment_types");
        await client.query("DELETE FROM designations");
        await client.query("DELETE FROM departments");

        // --- Departments ---
        const deptRes = await client.query(
            "INSERT INTO departments (department_code, department_name) VALUES ($1, $2) RETURNING id",
            ["IT", "Information Technology"]
        );
        const deptId = deptRes.rows[0].id;

        await client.query(
            "INSERT INTO departments (department_code, department_name) VALUES ($1, $2)",
            ["HR", "Human Resources"]
        );

        await client.query(
            "INSERT INTO departments (department_code, department_name) VALUES ($1, $2)",
            ["FIN", "Finance"]
        );

        // --- Designations ---
        const desigRes = await client.query(
            "INSERT INTO designations (title) VALUES ($1) RETURNING id",
            ["Software Engineer"]
        );
        const desigId = desigRes.rows[0].id;

        await client.query("INSERT INTO designations (title) VALUES ($1)", ["HR Manager"]);
        await client.query("INSERT INTO designations (title) VALUES ($1)", ["Accountant"]);
        await client.query("INSERT INTO designations (title) VALUES ($1)", ["Team Lead"]);

        // --- Employment Types ---
        const empTypeRes = await client.query(
            "INSERT INTO employment_types (type_name) VALUES ($1) RETURNING id",
            ["Full-Time"]
        );
        const empTypeId = empTypeRes.rows[0].id;

        await client.query("INSERT INTO employment_types (type_name) VALUES ($1)", ["Part-Time"]);
        await client.query("INSERT INTO employment_types (type_name) VALUES ($1)", ["Contract"]);

        // --- Job Statuses ---
        const jobStatusRes = await client.query(
            "INSERT INTO job_statuses (status_name) VALUES ($1) RETURNING id",
            ["Active"]
        );
        const jobStatusId = jobStatusRes.rows[0].id;

        await client.query("INSERT INTO job_statuses (status_name) VALUES ($1)", ["Inactive"]);
        await client.query("INSERT INTO job_statuses (status_name) VALUES ($1)", ["On Leave"]);

        // --- Work Modes ---
        const workModeRes = await client.query(
            "INSERT INTO work_modes (mode_name) VALUES ($1) RETURNING id",
            ["Remote"]
        );
        const workModeId = workModeRes.rows[0].id;

        await client.query("INSERT INTO work_modes (mode_name) VALUES ($1)", ["On-Site"]);
        await client.query("INSERT INTO work_modes (mode_name) VALUES ($1)", ["Hybrid"]);

        // --- Work Locations ---
        const workLocRes = await client.query(
            "INSERT INTO work_locations (location_name) VALUES ($1) RETURNING id",
            ["Main Office"]
        );
        const workLocationId = workLocRes.rows[0].id;

        await client.query("INSERT INTO work_locations (location_name) VALUES ($1)", ["Branch Office"]);

        // --- Shifts ---
        const shiftRes = await client.query(
            "INSERT INTO shifts (name, start_time, end_time, late_after_minutes) VALUES ($1, $2, $3, $4) RETURNING id",
            ["General", "09:00:00", "18:00:00", 15]
        );
        const shiftId = shiftRes.rows[0].id;

        await client.query(
            "INSERT INTO shifts (name, start_time, end_time, late_after_minutes) VALUES ($1, $2, $3, $4)",
            ["Morning", "07:00:00", "15:00:00", 10]
        );

        // --- Leave Types ---
        const annualLeaveRes = await client.query(
            "INSERT INTO leave_types (name) VALUES ($1) RETURNING id",
            ["Annual Leave"]
        );
        const annualLeaveId = annualLeaveRes.rows[0].id;

        const sickLeaveRes = await client.query(
            "INSERT INTO leave_types (name) VALUES ($1) RETURNING id",
            ["Sick Leave"]
        );
        const sickLeaveId = sickLeaveRes.rows[0].id;

        await client.query("INSERT INTO leave_types (name) VALUES ($1)", ["Casual Leave"]);
        await client.query("INSERT INTO leave_types (name) VALUES ($1)", ["Maternity Leave"]);

        // --- Employee Info ---
        const empRes = await client.query(
            "INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            ["EMP001", "Huzaifa ", "Kaleem", "42101-1234567-1", "1990-05-15"]
        );
        const empId = empRes.rows[0].id;

        await client.query(
            "INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth) VALUES ($1, $2, $3, $4, $5)",
            ["EMP002", "Zaid Khan", "Asif Khan", "42101-7654321-2", "1992-08-20"]
        );

        // --- Extra Employee Info ---
        await client.query(
            `INSERT INTO extra_employee_info (employee_id, contact_1, contact_2, emergence_contact_1, emergence_contact_2, bank_name, bank_acc_num, perment_address, postal_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                "EMP001",
                "0300-1234567",
                "0301-1234567",
                "0302-1234567",
                "0303-1234567",
                "HBL",
                "123456789012",
                "123 Main Street, Karachi",
                "123 Main Street, Karachi",
            ]
        );

        await client.query(
            `INSERT INTO extra_employee_info (employee_id, contact_1, contact_2, emergence_contact_1, emergence_contact_2, bank_name, bank_acc_num, perment_address, postal_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                "EMP002",
                "0300-7654321",
                null,
                "0302-7654321",
                null,
                "UBL",
                "987654321098",
                "456 Park Avenue, Lahore",
                "456 Park Avenue, Lahore",
            ]
        );

        // --- Job Info ---
        await client.query(
            `INSERT INTO job_info (employee_id, department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                "EMP001",
                deptId,
                desigId,
                empTypeId,
                jobStatusId,
                workModeId,
                workLocationId,
                shiftId,
                "2023-01-15",
                null,
            ]
        );

        await client.query(
            `INSERT INTO job_info (employee_id, department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                "EMP002",
                deptId,
                desigId,
                empTypeId,
                jobStatusId,
                workModeId,
                workLocationId,
                shiftId,
                "2023-03-01",
                null,
            ]
        );

        // --- Roles ---
        // Super Admin - global role with NULL department_id
        const superAdminRoleRes = await client.query(
            "INSERT INTO roles (department_id, role_name, description) VALUES ($1, $2, $3) RETURNING id",
            [null, "super_admin", "Global super administrator with full system access"]
        );
        const superAdminRoleId = superAdminRoleRes.rows[0].id;

        const adminRoleRes = await client.query(
            "INSERT INTO roles (department_id, role_name, description) VALUES ($1, $2, $3) RETURNING id",
            [deptId, "Admin", "System Administrator with full access"]
        );
        const adminRoleId = adminRoleRes.rows[0].id;

        const empRoleRes = await client.query(
            "INSERT INTO roles (department_id, role_name, description) VALUES ($1, $2, $3) RETURNING id",
            [deptId, "Employee", "Regular employee with standard access"]
        );
        const empRoleId = empRoleRes.rows[0].id;

        await client.query(
            "INSERT INTO roles (department_id, role_name, description) VALUES ($1, $2, $3)",
            [deptId, "Manager", "Department Manager with approval rights"]
        );

        // --- Users ---
        const hashedPassword = "$2b$10$adY9EcoD4pSvdokfM5JJEu1.VeZUpmMT7pUDoKWQOZW4cjcQ2TuOa";

        await client.query(
            "INSERT INTO users (employee_id, email, password, role_id) VALUES ($1, $2, $3, $4)",
            [
                "EMP001",
                "john.doe@company.com",
                hashedPassword,
                adminRoleId,
            ]
        );

        await client.query(
            "INSERT INTO users (employee_id, email, password, role_id) VALUES ($1, $2, $3, $4)",
            [
                "EMP002",
                "jane.smith@company.com",
                hashedPassword,
                empRoleId,
            ]
        );

        // --- Super Admin User for testing ---
        await client.query(
            "INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth) VALUES ($1, $2, $3, $4, $5)",
            ["EMP000", "Super Admin", "Admin", "00000-0000000-0", "1990-01-01"]
        );

        await client.query(
            "INSERT INTO users (employee_id, email, password, role_id) VALUES ($1, $2, $3, $4)",
            [
                "EMP000",
                "admin@ems.com",
                hashedPassword,
                superAdminRoleId,
            ]
        );

        await client.query("COMMIT");
        console.log("Seed data inserted successfully");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
