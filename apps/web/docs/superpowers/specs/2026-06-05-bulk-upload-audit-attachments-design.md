# Bulk Upload, Audit Logs, And Employee Attachments Design

## Scope

This design covers three connected EMS features:

- Bulk employee upload from one Excel `.xlsx` file.
- Full audit logging for every backend-supported persistent action.
- Employee profile photo and document attachments uploaded after an employee exists.

Bulk upload is for employee text/data only. It will not upload photos, documents, salary history, allowances, login accounts, or promotion/job history.

## Locked Product Decisions

- Bulk upload v1 supports `.xlsx` only.
- HR uploads one Excel file only.
- The workbook has one main `Employees` sheet plus reference/example sheets.
- Employee IDs are entered by HR.
- New employee ID format is `EMP0001` through `EMP9999`.
- Existing mock seed data should be updated to the new format because the seed is mock data.
- Preview is validate-only and view-only.
- HR fixes invalid rows in Excel and re-uploads.
- HR can import only valid rows from a mixed upload.
- Each valid employee imports in its own transaction.
- Bulk upload does not create login accounts.
- Bulk upload does not create salary records.
- Bulk upload does not create allowances.
- Bulk upload does not upload profile pictures or documents.
- Salary history, allowances, account creation, profile photos, and attachments are handled after import from the employee profile.
- Mandatory fields are errors.
- Nullable/optional fields can be empty.
- Important missing optional data is a warning.
- Unknown master data names are errors in v1. HR must add missing departments, designations, locations, shifts, work modes, employment types, or statuses in Settings first.
- Audit Logs are mandatory for every database-changing action.
- Audit Logs are Super Admin only and immutable.

## Excel Workbook

The generated workbook should include these sheets:

- `Employees`
- `Reference Departments`
- `Reference Designations`
- `Reference Locations`
- `Reference Shifts`
- `Reference Employment Types`
- `Reference Job Statuses`
- `Reference Work Modes`
- `Example Row`

The `Employees` sheet is one row per employee. Reference sheets are generated from live backend configuration data so HR can copy valid names and avoid raw UUIDs.

Excel validations should be added where practical:

- Employee ID must match `EMP0001` style.
- CNIC, phone, email-like fields, dates, and numbers should have workbook-level validation.
- Department, designation, location, shift, employment type, job status, and work mode should use reference/dropdown guidance where practical.
- Boolean fields use dropdowns such as `Yes` and `No`.

Excel validation is only a helper. Backend validation remains authoritative because users can paste invalid values or edit files outside Excel.

## Employee Sheet Columns

Identity and personal info:

- `employee_id`
- `full_name`
- `father_name`
- `cnic`
- `date_of_birth`

Job info:

- `department`
- `designation`
- `employment_type`
- `job_status`
- `work_mode`
- `work_location`
- `shift`
- `date_of_joining`
- `date_of_exit`
- `probation_end_date`
- `contract_end_date`

Contact and address:

- `primary_phone`
- `alternate_phone`
- `permanent_country`
- `permanent_province`
- `permanent_district`
- `permanent_city`
- `permanent_town`
- `permanent_street`
- `permanent_postal_code`
- `postal_same_as_permanent`
- `postal_country`
- `postal_province`
- `postal_district`
- `postal_city`
- `postal_town`
- `postal_street`
- `postal_postal_code`

Emergency contacts:

- `emergency_contact_1_relation`
- `emergency_contact_1_full_name`
- `emergency_contact_1_phone`
- `emergency_contact_1_phone_country_code`
- `emergency_contact_1_email`
- `emergency_contact_2_relation`
- `emergency_contact_2_full_name`
- `emergency_contact_2_phone`
- `emergency_contact_2_phone_country_code`
- `emergency_contact_2_email`
- `primary_emergency_contact`

Bank info:

- `bank_name`
- `branch_name`
- `branch_code`
- `iban`
- `account_title`
- `account_number`
- `account_type`

Medical info:

- `blood_group`
- `gender`
- `height_cm`
- `weight_kg`
- `has_disability`
- `disability_type`
- `disability_description`
- `has_chronic_condition`
- `chronic_condition_notes`
- `has_known_allergies`
- `allergy_notes`
- `emergency_medication`
- `fitness_status`
- `last_medical_exam_date`
- `next_medical_exam_date`

## Excluded From Bulk Upload V1

- Salary and salary history.
- Allowances.
- Login accounts and credentials.
- Profile photos.
- Documents and attachments.
- Promotion/job history.

After import, the UI should guide HR to complete these from each employee profile.

## Backend Architecture

Bulk upload should use separate routes and a separate service path from normal Add Employee.

Recommended routes:

- `GET /api/employees/bulk/template`
- `POST /api/employees/bulk/validate`
- `POST /api/employees/bulk/import`

Normal Add Employee remains stable:

- `POST /api/employees`
- Uses the existing create employee flow.
- Keeps its existing account/salary behavior unless separately changed.

Bulk upload flow:

- Parses one `.xlsx` file.
- Reads the `Employees` sheet.
- Resolves readable names to UUIDs.
- Validates rows.
- Produces a preview.
- Imports only valid rows after HR confirmation.
- Skips account, salary, and allowance creation.

The bulk service must not blindly call the current `createEmployee()` because that service currently expects account data and creates login credentials. It should use a separate import function or a refactored lower-level employee insert helper that supports the locked bulk-upload scope.

## Validation

Validation happens twice:

1. Validate-only preview.
2. Final import re-validation.

Errors block row import:

- Missing mandatory fields.
- Employee ID not matching `EMP0001`.
- Duplicate employee ID.
- Duplicate CNIC.
- Invalid dates.
- Unknown department, designation, employment type, job status, work mode, work location, or shift.
- Designation not linked to selected department.
- Invalid mandatory contact/address fields.
- Invalid bank or medical fields when those optional sections are present.

Warnings do not block import:

- Missing nullable bank info.
- Missing nullable medical info.
- Missing profile photo.
- Missing documents.
- Missing login account.
- Missing salary history.
- Missing allowances.

Only rows with zero errors can be imported.

## Preview UX

The preview screen is view-only.

It should show:

- Total rows.
- Valid rows.
- Rows with errors.
- Rows with warnings.
- Duplicate rows.
- Importable count.
- Row-by-row validation details.

Actions:

- `Import valid rows`
- `Download error report`
- `Re-upload file`
- `Cancel`

If 20 rows are uploaded and 11 are valid:

- HR can import the 11 valid rows.
- The 9 invalid rows are skipped.
- HR fixes the Excel file and re-uploads later.

## Final Import

Each valid row imports in its own transaction.

If 11 rows are valid and one unexpectedly fails during final import:

- 10 can still import.
- 1 is reported as final import failure.
- Invalid preview rows remain skipped.

The import response should include:

- Imported employee IDs.
- Skipped invalid row numbers.
- Final import failure row numbers.
- Warnings.
- Next actions.

## Post Import Next Actions

After import, show a completion modal and employee checklist.

Completion modal examples:

- Create login accounts.
- Add salary history.
- Add allowances.
- Upload profile photos.
- Upload employee documents.
- Complete missing optional bank, medical, or contact data.

Employee profile checklist examples:

- Account not created.
- Profile photo missing.
- Attachments missing.
- Salary history missing.
- Allowances missing.
- Optional bank or medical fields incomplete.

## Employee Attachments

Attachments are uploaded after employees exist.

Supported attachment areas:

- Profile photo.
- CNIC copies.
- Contracts.
- Certificates.
- Medical documents.
- Experience letters.
- Other HR documents.

Files are stored locally for now under backend `public/uploads`, with a structure that remains VPS-safe later:

- `public/uploads/employees/<employee_id>/profile/`
- `public/uploads/employees/<employee_id>/documents/`

The database stores metadata only:

- employee ID.
- document type.
- original filename.
- stored filename.
- path.
- MIME type.
- size.
- uploaded by.
- uploaded at.

Access is permission-based. Users with permission can view/download. Upload and delete permissions should be separate. Audit Logs must record upload, replacement, and delete-like actions if deletion is supported.

## Audit Logs

Audit Logs are mandatory for every backend-supported persistent action.

Audit Logs must cover:

- Login.
- Logout.
- Forced password change.
- Employee create/update/status changes.
- Account creation and credential resend/reset.
- Leave request, approval, rejection, and balance initialization.
- Attendance save/update/submit/verify/unlock and sheet/report generation.
- Penalty propose/approve/reject/acknowledge.
- Announcements create/update/status changes.
- Calendar event create/update/status changes.
- Configuration/master data changes.
- Bulk upload validation and final import.
- Profile photo and document upload/replacement/delete-like actions.
- Any new module action that inserts, updates, uploads, imports, generates official data, approves, rejects, or changes status.

Audit Log access:

- Super Admin only.
- Read-only.
- No edit endpoint.
- No delete endpoint.
- No edit/delete UI controls, including for Super Admin.

Audit Log filters:

- Module/tab.
- Action type.
- Actor.
- Target employee/resource.
- Status.
- Date range.

Audit Log records should avoid secrets:

- no passwords.
- no hashes.
- no tokens.
- no file binary data.
- no sensitive medical notes unless explicitly required.

## Employee ID Format Change

The app should move from `EMP001` to `EMP0001`.

Required updates:

- Backend employee schema/test validation.
- Frontend Add Employee validation.
- Bulk upload validation.
- Seed/mock employee IDs.
- UI copy/examples/tests that mention the old format.

No production migration is required for existing mock data because the user will run `npm.cmd run db:seed` after seed updates.

## Testing And Verification

Backend tests should cover:

- Template generation.
- Excel parsing.
- Name-to-UUID mapping.
- Row validation errors.
- Warning-only rows.
- Duplicate employee ID/CNIC handling.
- Unknown master data errors.
- Designation/department mismatch.
- Validate-only writes no employees.
- Final import imports valid rows only.
- Per-employee transaction behavior.
- Audit log writes.
- Employee ID `EMP0001` validation.

Frontend tests should cover:

- Bulk upload entry point.
- Template download action.
- Validate upload flow.
- Preview summary.
- Error/warning row display.
- Import valid rows action.
- Completion modal next actions.
- Employee ID `EMP0001` Add Employee validation.

Verification commands:

- Backend: `npm.cmd test`
- Backend: `npm.cmd run db:check`
- Frontend: `npm.cmd test -- --run`
- Frontend: `npm.cmd run build`

