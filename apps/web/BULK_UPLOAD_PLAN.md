# Bulk Employee Upload Plan

## Goal

Allow HR to import employees from CSV/XLSX safely, with row-level validation, preview, and clear errors before creating records.

## Template Columns

Required columns:
- employee_id
- full_name
- father_name
- cnic
- date_of_birth
- department_code or department_name
- designation_title
- employment_type
- job_status
- work_location
- work_mode
- shift
- date_of_joining
- primary_phone
- emergency_contact_name
- emergency_contact_relation
- emergency_contact_phone
- bank_name
- account_title
- iban
- employee_email

Optional columns:
- gender
- secondary_phone
- permanent_address
- postal_address
- blood_group
- height_cm
- weight_kg
- allergy_notes
- chronic_condition_notes
- base_salary
- allowance columns by configured allowance type
- role_name

## Upload Flow

1. HR downloads the template from the Employees page.
2. HR uploads CSV/XLSX.
3. Backend parses rows and returns a validation preview.
4. Frontend shows valid rows, invalid rows, and exact row/column errors.
5. HR fixes the file or confirms import.
6. Backend imports inside a transaction.
7. Backend creates employee core data and supporting records including leave balances.

## Validation Rules

- Reject duplicate employee IDs.
- Reject duplicate CNIC numbers.
- Reject duplicate account emails.
- Validate department exists.
- Validate designation belongs to selected department.
- Validate date of birth is not before year 900.
- Validate joining date and date formats.
- Validate mandatory fields.
- Validate salary and allowance numbers.
- Validate role exists and is not Super Admin.

## Backend Pattern

Use a dedicated import endpoint, for example:
- `POST /api/employees/import/preview`
- `POST /api/employees/import/commit`

Follow existing controller/service/schema/test patterns. Do not partially import bad files unless an explicit future setting supports partial import.

