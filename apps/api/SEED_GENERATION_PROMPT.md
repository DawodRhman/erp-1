# COMPREHENSIVE DATABASE SEED FILE GENERATION PROMPT
### For Claude Code / AI Agent with Full Codebase Access
---

## ⚠️ MANDATORY FIRST STEP — READ THE CODEBASE BEFORE WRITING A SINGLE LINE

The project root is `C:\Users\zaidb\OneDrive\Desktop\EMS\backend` (or wherever it is checked out). All paths below are relative to that root. Before writing any seed data, you **MUST** do the following in order:

1. **Read every migration file inside `migrations/`** — read them in numeric order:
   ```
   migrations/1712620800000_enable_extensions.sql
   migrations/1712620801000_create_sequences.sql
   migrations/1712620802000_create_functions.sql
   migrations/1712620803000_create_tables.sql
   migrations/1712620804000_create_constraints.sql
   migrations/1712620805000_create_indexes.sql
   migrations/1712620806000_create_triggers.sql
   migrations/1712620807000_add_attendance_ack.sql
   migrations/1712620808000_add_hcm_support_tables.sql
   migrations/1712620809000_users_auth_fields.sql
   migrations/1712620810000_departments_is_active.sql
   migrations/1712620811000_attendance_branch_lock.sql
   migrations/1712620812000_penalty_engine.sql
   migrations/1712620813000_leave_capacity_config.sql
   migrations/1712620814000_directory_entries.sql
   migrations/1712620815000_activity_logs.sql
   migrations/1712620816000_add_leave_rejection_reason.sql
   migrations/1712620817000_split_employee_extra_info.sql
   migrations/1712620817500_add_salary_allowance_tables.sql
   migrations/1712620818000_add_salary_allowance_permissions.sql
   ```
   Build a complete picture of every table, every column, every CHECK constraint, every ENUM type, every FK, and every ALTER that was applied on top of the base tables. Later migrations override earlier ones — the final state after all migrations is what matters.

2. **Read every route file under `src/modules/`** — the module structure is:
   ```
   src/modules/attendance/attendance.routes.js
   src/modules/auth/auth.routes.js
   src/modules/calendar-events/calendar-events.routes.js
   src/modules/config/config.routes.js
   src/modules/dashboard/dashboard.routes.js
   src/modules/directory/directory.routes.js
   src/modules/employees/employees.routes.js
   src/modules/leave/leave.routes.js
   src/modules/notifications/notifications.routes.js
   src/modules/penalties/penalties.routes.js
   ```
   For every POST/PUT/PATCH endpoint, note exactly which fields the route expects in the body.

3. **Read every controller file under `src/modules/`**:
   ```
   src/modules/attendance/attendance.controller.js
   src/modules/auth/auth.controller.js
   src/modules/calendar-events/calendar-events.controller.js
   src/modules/config/config.controller.js
   src/modules/dashboard/dashboard.controller.js
   src/modules/directory/directory.controller.js
   src/modules/employees/employees.controller.js
   src/modules/leave/leave.controller.js
   src/modules/notifications/notifications.controller.js
   src/modules/penalties/penalties.controller.js
   ```
   Note any auto-generated fields (IDs, timestamps), any fields the backend derives vs expects from input.

4. **Read every service file under `src/modules/`**:
   ```
   src/modules/attendance/attendance.service.js
   src/modules/auth/auth.service.js
   src/modules/calendar-events/calendar-events.service.js
   src/modules/config/config.service.js
   src/modules/dashboard/dashboard.service.js
   src/modules/directory/directory.service.js
   src/modules/employees/employees.service.js
   src/modules/leave/leave.service.js
   src/modules/notifications/notifications.service.js
   src/modules/penalties/penalties.service.js
   ```
   Note any business logic that affects what valid data looks like (e.g. auto-set `employee_id` format, status transitions, date validations beyond DB constraints).

5. **Read every schema/validator file** — two locations:
   ```
   src/modules/employees/employees.schema.js   ← module-level schema
   src/schemas/attendance.schema.js
   src/schemas/calendar-event.schema.js
   src/schemas/department.schema.js
   src/schemas/designation.schema.js
   src/schemas/employee.schema.js
   src/schemas/employment-type.schema.js
   src/schemas/job-info.schema.js
   src/schemas/job-status.schema.js
   src/schemas/leave-balance.schema.js
   src/schemas/leave-policy.schema.js
   src/schemas/leave-request.schema.js
   src/schemas/leave-type.schema.js
   src/schemas/notification.schema.js
   src/schemas/shift.schema.js
   src/schemas/user.schema.js
   src/schemas/work-location.schema.js
   src/schemas/work-mode.schema.js
   ```
   Every field validation rule here (min/max length, regex, enum values, required/optional) must be honoured in the seed data.

6. **Read all middleware files**:
   ```
   src/middleware/auth-middleware.js
   src/middleware/auth.js
   src/middleware/permission-middleware.js
   src/middleware/require-permission.js
   src/middleware/sanitize-middleware.js
   src/middleware/self-service-middleware.js
   src/middleware/validate-middleware.js
   src/middleware/validate.js
   ```
   Understand how auth tokens and role checks work — this tells you what the `users` table and `roles`/`permissions` tables must look like for login to succeed.

7. **Read `src/config/db.js`** — confirm the Pool setup and `DATABASE_URL` env var name used.

8. **Read `src/utils/errors.js`, `src/utils/respond.js`, `src/utils/paginate.js`** — understand response shapes and any helper that may affect how data must be structured.

9. **Read `package.json`** — confirm `"type": "module"` (ES Modules), confirm `bcrypt`/`bcryptjs` package name, confirm `pg` or other DB client. The seed file must use `import` not `require`.

10. **Read `.env.example`** — confirm exact env var names.

11. **Read the three existing seed files** as reference for the established pattern:
    ```
    seeds/dev_seed.js
    seeds/comprehensive_seed.js
    seeds/full_mock_seed.js
    ```
    Mirror their structure: aggressive TRUNCATE (outside transaction) → `BEGIN` → insert all in FK-safe order → `COMMIT`.

12. **Read `scripts/profess-seed.js` and `scripts/seed-permissions.js`** — these may contain permission key lists or helper patterns worth reusing.

Only after completing all 12 steps above, proceed to generate the seed file. Output it as `seeds/master_seed.js`.

---

## OUTPUT SPEC

**File name:** `seeds/master_seed.js`  
**Module system:** ES Modules — use `import` not `require`  
**Structure:**
```js
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid'; // only if gen_random_uuid() not used via raw SQL

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Transaction pattern (mirror existing `seeds/dev_seed.js` pattern):**
```
Phase 1 — Aggressive TRUNCATE (outside transaction, RESTART IDENTITY CASCADE)
Phase 2 — BEGIN → insert all tables in FK-dependency order → COMMIT
Phase 3 — pool.end()
```

---

## SCENARIO CONTEXT

You are seeding an **ERP system for "Electronic Safety & Security Pvt. Ltd (ESSPL)"** — a mid-size Pakistani IT/security company based in Karachi with branch offices in Lahore and Islamabad. The company sells and installs CCTV, access control, fire alarm, and networking equipment. It has an HR department, IT department, Sales department, Procurement department, Finance department, Operations/Field department, and a Customer Support department.

This seed must look like **36 years of real operational data (1990-01-01 through 2026-05-12)**. Every date-stamped record must fall within this window and be internally consistent. Every piece of data must be internally consistent — names, CNICs, dates, salaries, leave balances, attendance records — everything must tell a coherent story.

---

## TABLE-BY-TABLE REQUIREMENTS

Seed **every single table listed below** with the **exact columns** shown. Do not skip any table. Do not skip any column unless it is explicitly nullable and leaving it null makes realistic sense.

---

### 1. `departments`
Columns: `id, department_code, department_name, created_at, parent_department_id, is_active, updated_at`

Seed these departments (plus sub-departments):
- `IT` (parent: none) → sub: `IT-Support`, `IT-Development`
- `Software Engineering` (parent: none) → sub: `Frontend`, `Backend`, `Mobile`, `QA`, `DevOps`
- `HR` (parent: none)
- `Sales` (parent: none) → sub: `Sales-Karachi`, `Sales-Lahore`, `Sales-Islamabad`
- `Procurement` (parent: none)
- `Finance` (parent: none)
- `Operations` (parent: none) → sub: `Field-Engineering`, `Installations`
- `Customer-Support` (parent: none)
- `Administration` (parent: none)

`department_code` must follow pattern: `DEPT-IT`, `DEPT-SWE`, `DEPT-SWE-FE`, `DEPT-SWE-BE`, `DEPT-SWE-MOB`, `DEPT-SWE-QA`, `DEPT-SWE-DEVOPS`, `DEPT-HR`, `DEPT-SALES`, etc.  
All `is_active = true`. `parent_department_id` properly references parent dept UUID.

---

### 2. `designations`
Columns: `id, title, is_active, created_at, updated_at`

Seed at least 25 realistic designations:
- CEO, COO, CFO, CTO
- General Manager, Deputy General Manager
- HR Manager, HR Executive, HR Officer, HR Intern
- IT Manager, IT Support Engineer, Network Engineer, System Administrator
- Software Engineering Manager, Tech Lead, Principal Engineer, Senior Software Engineer, Software Engineer, Junior Software Engineer, Associate Developer, Frontend Developer, Senior Frontend Developer, Backend Developer, Senior Backend Developer, Mobile Developer, Senior Mobile Developer, DevOps Engineer, Senior DevOps Engineer, QA Engineer, Senior QA Engineer, QA Lead, UI/UX Designer
- Sales Manager, Senior Sales Executive, Sales Executive, Sales Intern
- Procurement Manager, Procurement Officer
- Finance Manager, Finance Officer, Accountant
- Operations Manager, Field Engineer, Installation Technician, Team Lead
- Customer Support Manager, Support Executive

---

### 3. `employment_types`
Columns: `id, type_name, is_active, created_at, updated_at`

Seed: `Full-Time`, `Part-Time`, `Contract`, `Internship`, `Probationary`

---

### 4. `job_statuses`
Columns: `id, status_name, is_active, created_at, updated_at`

Seed: `Active`, `Probation`, `On Leave`, `Suspended`, `Terminated`, `Resigned`

---

### 5. `work_modes`
Columns: `id, mode_name, is_active, created_at, updated_at`

Seed: `On-Site`, `Remote`, `Hybrid`, `Field`

---

### 6. `work_locations`
Columns: `id, location_name, is_active, created_at, updated_at`

Seed: `Head Office - Karachi`, `Branch Office - Lahore`, `Branch Office - Islamabad`, `Warehouse - Karachi`, `Client Site - Karachi`, `Client Site - Lahore`

---

### 7. `shifts`
Columns: `id, name, start_time, end_time, late_after_minutes, is_active, created_at, updated_at`

Seed:
- `Morning Shift` → 08:00–17:00, late_after=15
- `Evening Shift` → 14:00–22:00, late_after=15
- `Night Shift` → 22:00–06:00, late_after=20
- `Field Shift` → 09:00–18:00, late_after=30
- `Flexible Shift` → 10:00–19:00, late_after=30

---

### 8. `permissions`
Columns: `id, permission_key, description, created_at`

Seed ALL of the following permission keys (read the existing dev_seed.js for the full list, it is the source of truth). Must include at minimum:
`config:read`, `config:manage`, `employees:read`, `employees:write`, `leave:read`, `leave:write`, `leave:approve`, `attendance:read`, `attendance:write`, `attendance:approve`, `calendar:read`, `calendar:write`, `notifications:read`, `notifications:write`, `alerts:read`, `pending_actions:read`, `dashboard:read`, `directory:read`, `directory:write`, `inventory:read`, `inventory:write`, `purchasing:read`, `purchasing:write`, `purchasing:approve`, `hr:full_access`, `payroll:read`, `payroll:write`, `penalties:read`, `penalties:write`, `penalties:approve`, `reports:read`

---

### 9. `roles`
Columns: `id, department_id, role_name, description, created_at`

Seed one role per department + these global roles (department_id = NULL for global, fix with `ALTER TABLE roles ALTER COLUMN department_id DROP NOT NULL` before inserting):
- `super_admin` (NULL dept) — all permissions
- `hr_manager` (HR dept)
- `hr_executive` (HR dept)
- `it_manager` (IT dept)
- `swe_manager` (Software Engineering dept)
- `tech_lead` (Software Engineering dept)
- `sales_manager` (Sales dept)
- `procurement_manager` (Procurement dept)
- `finance_manager` (Finance dept)
- `operations_manager` (Operations dept)
- `employee` (NULL or any dept) — basic read permissions only

---

### 10. `role_permissions`
Columns: `role_id, permission_id`

Wire every role to its appropriate permissions. `super_admin` gets ALL permissions. `employee` gets only: `leave:read`, `leave:write`, `attendance:read`, `notifications:read`, `calendar:read`, `directory:read`. Other roles get domain-appropriate permissions.

---

### 11. `employee_info` ← CORE TABLE
Columns: `id, employee_id, name, father_name, cnic, date_of_birth, created_at, updated_at`

**Generate 520 employees** (500 regular + 20 managers/admins).

Rules:
- `employee_id` format: `EMP-0001` through `EMP-0520` — **check the codebase to confirm exact format used by the backend's ID generator, replicate it exactly**.
- `name` — realistic Pakistani full names (mix of Urdu-origin names): e.g. `Muhammad Bilal Ahmed`, `Fatima Noor`, `Ali Hassan Siddiqui`, `Sana Pervaiz`, `Usman Tariq`, `Ayesha Raza`, `Haris Mehmood`, `Zainab Malik`, etc. Use 150+ distinct first names and 80+ distinct last names to avoid repetition.
- `father_name` — realistic e.g. `Muhammad Ahmed`, `Haji Pervaiz Khan`, `Abdul Razzaq Siddiqui`
- `cnic` — format `#####-#######-#` e.g. `42101-1234567-9` (Karachi CNICs start with 42101-42301). Make each unique.
- `date_of_birth` — ages between 18 and 70 years relative to today 2026-05-12 (born 1956–2008). Format as stored in schema: `character varying(15)`, use `'DD-MM-YYYY'` string format. Veteran employees joined in 1990 are typically born 1950s–1960s; recent hires born 1990s–2000s.
- Spread join dates across 1990–2026 (matching `date_of_joining` range above).

---

### 12. `job_info`
Columns: `id, employee_id, department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit, created_at, updated_at, probation_end_date, contract_end_date`

Every employee must have exactly one `job_info` row.

Rules:
- Distribute employees realistically across departments:
  - IT: ~50 employees
  - Software Engineering: ~120 employees, distributed across sub-depts:
    - Frontend: ~30 (React/Next.js devs, UI engineers)
    - Backend: ~35 (Node.js, .NET, API devs)
    - Mobile: ~15 (React Native, Flutter devs)
    - QA: ~20 (manual + automation testers)
    - DevOps: ~20 (CI/CD, cloud infra, Docker/K8s engineers)
  - Sales: ~100 employees
  - HR: ~30 employees
  - Procurement: ~25 employees
  - Finance: ~30 employees
  - Operations/Field: ~120 employees
  - Customer Support: ~60 employees
  - Administration: ~45 employees
- `date_of_joining` between 1990-01-01 and 2026-05-12 (today) — spread realistically across the full 36-year window; veteran employees (1990–2005) are senior/manager-level, mid-career (2006–2018) are mid to senior-level, recent hires (2019–2026) are junior to mid-level
- `probation_end_date` = `date_of_joining + 3 months` for employees with status = `Probation`
- `contract_end_date` = set for `Contract` type employees only, 6–18 months after joining
- `date_of_exit` = set for ~40 employees who resigned/terminated (job_status = Resigned/Terminated)
- `work_mode_id` — Field engineers get `Field`; IT staff mix of `On-Site`/`Hybrid`; Software Engineering staff are heavily `Remote` and `Hybrid` (~40% Remote, ~40% Hybrid, ~20% On-Site); sales get `On-Site` or `Hybrid`

---

### 13. `employee_job_history`
Columns: `id, employee_id, department_id, designation_id, manager_emp_id, start_date, end_date, created_at, updated_at`

For every employee, insert:
- Their initial job history row (start_date = date_of_joining, end_date = NULL for current)
- For ~80 employees who got promoted/transferred, add a previous row with end_date set

`manager_emp_id` — reference a real manager employee_id in that department (designation = Manager/Senior).

---

### 14. `users`
Columns: `id, employee_id, email, password, role_id, created_at, updated_at, must_change_password, password_changed_at`

Every employee gets a user account.

Rules:
- `email` — format `firstname.lastname@esspl.com.pk` (lowercase, dots). Ensure uniqueness.
- `password` — bcrypt hash of `Esspl@2024!` for all employees, `SuperAdmin@123!` for super_admin, `HrManager@123!` for hr_manager
- `must_change_password` — `true` for all employees hired in last 6 months, `false` for others
- `password_changed_at` — set for those where `must_change_password = false`
- `role_id` — map correctly: managers get their role, all others get `employee` role, 1 user gets `super_admin`

---

### 15. `emergency_contacts`
Columns: `id, employee_id, contact_1, contact_2, perment_address, postal_address, created_at, updated_at, e_contact_1_relation, e_contact_1_full_name, e_contact_1_phone, e_contact_1_phone_country_code, e_contact_1_email, e_contact_2_relation, e_contact_2_full_name, e_contact_2_phone, e_contact_2_phone_country_code, e_contact_2_email, primary_contact`

Every employee must have an emergency contact row.

Rules:
- `contact_1` / `e_contact_1_phone` — Pakistani mobile format: `03XX-XXXXXXX` or `03XXXXXXXXX`
- `e_contact_1_phone_country_code` — `'+92'`
- `e_contact_1_relation` — one of ENUM values: `father`, `mother`, `brother`, `sister`, `wife`, `husband`
- `perment_address` — realistic Karachi/Lahore/Islamabad addresses: e.g. `House 12, Block 4, Gulshan-e-Iqbal, Karachi`
- `postal_address` — same or different
- `e_contact_2_*` — fill for ~300 employees, leave NULL for rest
- `primary_contact` — `1`

---

### 16. `employee_medical`
Columns: `id, employee_id, blood_group, date_of_birth, gender, height_cm, weight_kg, has_disability, disability_type, disability_description, has_chronic_condition, chronic_condition_notes, has_known_allergies, allergy_notes, emergency_medication, fitness_status, last_medical_exam_date, next_medical_exam_date, updated_by, created_at, updated_at`

Every employee must have a medical row.

Rules:
- `blood_group` — random from ENUM: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `unknown`. Realistic distribution: O+ ~35%, A+ ~30%, B+ ~25%, rest spread.
- `gender` — ENUM `male`/`female`/`other`. ~65% male, ~35% female for Pakistani corporate.
- `height_cm` — males: 165–185, females: 152–170
- `weight_kg` — males: 60–95, females: 50–75
- `has_disability` — `false` for 95%, `true` for ~5% with realistic `disability_type` and `disability_description`
- `has_chronic_condition` — `true` for ~10% with notes like `Hypertension`, `Type 2 Diabetes`, `Asthma`
- `has_known_allergies` — `true` for ~15% with realistic allergy notes
- `fitness_status` — `fit`, `fit_with_restrictions`, or `under_review`
- `last_medical_exam_date` — between 1990-01-01 and 2026-05-12; recent employees have recent exam dates, veteran employees have older ones with periodic renewals
- `next_medical_exam_date` — exactly 1 year after `last_medical_exam_date`
- `updated_by` — references an HR manager user UUID

---

### 17. `employee_bank_accounts`
Columns: `id, employee_id, bank_name, branch_name, branch_code, iban, account_title, account_number, account_type, is_verified, verified_by, verified_at, created_at, updated_at`

Every employee gets one bank account row.

Rules:
- `bank_name` — realistic Pakistani banks: `HBL`, `MCB Bank`, `UBL`, `Bank Alfalah`, `Meezan Bank`, `Allied Bank`, `JS Bank`, `Faysal Bank`, `National Bank of Pakistan`, `Standard Chartered Pakistan`
- `branch_name` — e.g. `Main Branch Karachi`, `Gulshan Branch`, `DHA Branch Lahore`
- `branch_code` — 4-digit numeric string e.g. `0012`, `0047`
- `iban` — Pakistani IBAN format: `PK36ALFA0123456789012345` (24 chars: PK + 2 check digits + 4 bank code + 16 account). Make each unique.
- `account_title` — same as employee name (title case)
- `account_number` — 10-16 digit string, unique per employee
- `account_type` — ENUM `current`, `savings`, `salary`. Most employees get `salary`.
- `is_verified` — `true` for ~85%, `false` for rest
- `verified_by` — references HR manager user UUID (only where `is_verified = true`)
- `verified_at` — within 30 days of account creation date, which itself falls between 1990-01-01 and 2026-05-12

---

### 18. `employee_salary`
Columns: `id, employee_id, basic_salary, currency, effective_from, effective_to, is_current, is_active, revision_type, revision_percent, revision_reason, created_by, created_at, updated_at`

Rules:
- Every employee must have at least 1 salary row (current). ~150 employees have 2 rows (one historical, one current — an increment happened).
- `basic_salary` — realistic PKR ranges:
  - Intern/Junior: 35,000–55,000
  - Officer/Executive: 55,000–90,000
  - Senior/Specialist: 90,000–150,000
  - **Software Engineering specific** (SWE market rates are higher in Pakistan):
    - Associate Developer / Junior SWE: 60,000–90,000
    - Software Engineer: 100,000–160,000
    - Senior Software Engineer / Frontend / Backend / Mobile Dev: 160,000–250,000
    - Tech Lead / Principal Engineer: 250,000–380,000
    - DevOps Engineer: 150,000–280,000
    - QA Engineer: 80,000–150,000
    - Senior QA / QA Lead: 150,000–220,000
    - UI/UX Designer: 90,000–170,000
  - Manager: 150,000–280,000
  - General Manager / DGM: 280,000–450,000
  - C-Level: 450,000–750,000
- `currency` — `'PKR'`
- `revision_type` — `'initial'` for first entry, `'increment'` or `'promotion'` for subsequent
- `revision_percent` — NULL for initial, 10–25 for increments
- `revision_reason` — `NULL` for initial, realistic reason for others: `'Annual Performance Increment'`, `'Promotion to Senior Engineer'`, `'Market Adjustment'`
- `effective_from` — initial = `date_of_joining`, revision = some date after
- `effective_to` — NULL for current (`is_current = true`), set for historical
- `is_current` — only one row per employee can be `true`
- `created_by` — HR manager user UUID

---

### 19. `allowance_types`
Columns: `id, field_name, is_active, created_at, updated_at`

Seed: `House Rent Allowance`, `Medical Allowance`, `Transport Allowance`, `Fuel Allowance`, `Mobile Allowance`, `Utility Allowance`, `Performance Bonus`, `Overtime Allowance`

---

### 20. `employee_allowances`
Columns: `id, employee_id, allowance_type_id, amount, is_percentage, is_current, is_active, created_by, created_at, updated_at`

Rules:
- All managers get: HRA (40–50% of salary as percentage), Medical (5,000–10,000 flat), Transport (3,000–5,000 flat)
- All employees get at minimum: Transport allowance (2,000–4,000 flat), Medical (3,000–5,000 flat)
- Senior staff additionally get: Fuel allowance (3,000–6,000), Mobile (1,500–2,500)
- `is_percentage` — `true` for HRA, `false` for others
- `is_current = true`, `is_active = true` for all current allowances
- `created_by` — HR manager UUID

---

### 21. `leave_types`
Columns: `id, name, is_active, created_at, updated_at`

Seed: `Annual Leave`, `Sick Leave`, `Casual Leave`, `Maternity Leave`, `Paternity Leave`, `Unpaid Leave`, `Compensatory Leave`, `Bereavement Leave`

---

### 22. `leave_policies`
Columns: `id, department_id, leave_type_id, days_allowed, year, is_active, created_at, updated_at`

For each department × each leave type × years 1990 through 2026 — but in practice seed policies for **2023, 2024, 2025, and 2026** as active years (pre-1990s policies would be archive noise; seed a representative set of recent years that covers all currently active employees):
- Annual Leave: 14 days
- Sick Leave: 10 days
- Casual Leave: 12 days
- Maternity Leave: 90 days (only relevant, still seed for all)
- Paternity Leave: 3 days
- Unpaid Leave: 30 days
- Compensatory Leave: 5 days
- Bereavement Leave: 3 days

---

### 23. `leave_balances`
Columns: `id, employee_id, leave_type_id, year, balance, used, created_at, updated_at`

For every active employee × every leave type × years **2023, 2024, 2025, and 2026** (the operationally relevant years; veteran employees from 1990s will have balances starting from their earliest active year in the system):
- `balance` = `days_allowed` from policy
- `used` = realistic usage (sick: 0–10, casual: 0–8, annual: 0–14 etc.)
- `balance` after use must be ≥ 0 (`balance - used >= 0`)

---

### 24. `leave_capacity_config`
Columns: `id, department_id, max_percent, is_active, created_by, updated_by, created_at, updated_at`

One row per department. `max_percent = 30` for Operations/Field (can't have too many absent at once), `50` for others.

---

### 25. `leave_requests`
Columns: `id, employee_id, leave_type_id, start_date, end_date, end_by_force, reason, status, reviewed_by, reviewed_at, created_at, updated_at, rejection_reason`

Seed ~800 leave requests across all employees spanning **1990-01-01 through 2026-05-12 (today)** — distribute proportionally: fewer records in early years (1990s), growing volume through 2000s–2010s, densest records in 2020–2026 to reflect realistic operational data growth.

Rules:
- Realistic distribution: ~60% approved, ~20% pending, ~12% rejected, ~8% cancelled
- `start_date` / `end_date` — coherent ranges, `end_date >= start_date`, duration 1–14 days
- `end_by_force` — NULL for most, set for ~10% (early return from leave; must be between start and end)
- `reason` — realistic: `"Family emergency"`, `"Medical appointment"`, `"Wedding ceremony"`, `"Fever and flu"`, `"Personal work"`, `"Father's surgery"`, etc.
- `reviewed_by` — HR manager UUID (only where approved/rejected)
- `reviewed_at` — after `created_at`, both within 1990-01-01 to 2026-05-12 window (only where approved/rejected)
- `rejection_reason` — only where `status = 'rejected'`
- CHECK: `end_date >= start_date` must hold. `end_by_force` if set must be between start and end.

---

### 26. `shifts` (already seeded in step 7)

---

### 27. `attendance`
Columns: `id, employee_id, shift_id, date, check_in, check_out, status, notes, marked_by, created_at, updated_at, ack, state, submitted_by, submitted_at, unlocked_by, unlock_reason, unlocked_at`

Seed attendance for ALL active employees for every working day from **January 2024 through May 2026 (today)** — approx 600+ working days. **Use batch inserts only** (chunks of 500 rows per query). For older periods (pre-2024) seed a representative 6-month sample per year from 1990 onward rather than every single day, to keep row count manageable while still showing history.

That means approximately 520 employees × 86 days = **~44,720 attendance rows**.

**Use a loop/batch insert for performance — do NOT generate 44k individual INSERT statements. Use a VALUES batch insert approach.**

Rules:
- `status` — ENUM CHECK: `present`, `absent`, `late`, `half_day`, `holiday`, `on_leave`
  - Weekdays: ~78% present, ~8% late, ~5% half_day, ~5% absent, ~4% on_leave
  - Pakistani public holidays (mark as `holiday`): Feb 5 (Kashmir Day), Mar 23 (Pakistan Day)
- `check_in` / `check_out` — only set when `status` is `present`, `late`, or `half_day`
  - Present: check_in = shift start ± 5 min, check_out = shift end ± 15 min
  - Late: check_in = shift start + 20–90 min, check_out = shift end ± 15 min
  - Half day: check_in = shift start ± 5 min, check_out = shift start + 4 hours
  - Absent/on_leave/holiday: `check_in = NULL`, `check_out = NULL`
- `state` — ENUM CHECK: `draft`, `saved`, `submitted`, `locked`, `ho_unlocked`
  - Records older than 60 days from today: `state = 'locked'`
  - Records 30–60 days old: `state = 'submitted'`
  - Records 0–30 days old: `state = 'saved'` or `'draft'`
- `ack` — `true` for locked records, `false` for others
- `marked_by` — HR executive UUID
- `submitted_by` — HR manager UUID (only where `state` is `submitted` or `locked`)
- `submitted_at` — only where submitted/locked
- `unlocked_by`, `unlock_reason`, `unlocked_at` — only for ~50 records where `state = 'ho_unlocked'`
- `notes` — set for late/absent/half_day with realistic notes: `"Traffic jam on Shahra-e-Faisal"`, `"Doctor visit"`, `"Power outage at residence"`, etc.

---

### 28. `penalty_rules`
Columns: `id, name, amount_pkr, type, is_active, created_by, created_at, updated_at`

Seed 8–10 penalty rules:
- `Late Arrival (1st offense)` — 500 PKR flat
- `Late Arrival (Repeated)` — 1,000 PKR flat
- `Unauthorized Absence` — 2,000 PKR flat
- `Policy Violation` — 5,000 PKR flat
- `Dress Code Violation` — 300 PKR flat
- `Misconduct` — 10,000 PKR flat
- `Performance Deduction` — 5% percentage
- `Attendance Shortage` — 2% percentage

`type` — ENUM CHECK: `flat` or `percentage`

---

### 29. `employee_penalties`
Columns: `id, employee_id, rule_id, date, reason, status, proposed_by, submitted_to_ho_at, reviewed_by, reviewed_at, review_note, employee_ack, employee_acked_at, created_at, updated_at`

Seed ~150 penalty records spanning **1990-01-01 through 2026-05-12** — bulk in 2018–2026, sparse in earlier years.

Rules:
- ~60 for late arrival, ~30 unauthorized absence, ~20 policy violation, rest misc
- `status` — ENUM: `pending`, `approved`, `rejected`
  - ~70% approved, ~20% pending, ~10% rejected
- `proposed_by` — HR executive UUID
- `reviewed_by` — HR manager UUID (only where approved/rejected)
- `reviewed_at` — after `created_at`, both within 1990-01-01 to 2026-05-12 window
- `employee_ack` — `true` for approved ones (employee acknowledged)
- `employee_acked_at` — set only where `employee_ack = true`
- `review_note` — realistic: `"Warning issued, deduction applied to October salary"`, `"Penalty waived due to valid reason provided"`

---

### 30. `calendar_events`
Columns: `id, type, date, title, visibility, created_by, updated_by, created_at, updated_at`

Seed ~50 calendar events spanning **2020 through 2026-05-12** (focus on upcoming/recent events; older years get annual holidays only):
- Pakistani public holidays every year from 2020 through 2026: Eid ul Fitr (3 days), Eid ul Adha (3 days), Pakistan Day (Mar 23), Independence Day (Aug 14), Quaid's Birthday (Dec 25), Ashura, Labour Day (May 1), Kashmir Day (Feb 5), Iqbal Day (Nov 9)
- Company events: Annual Performance Review (Dec), Mid-Year Review (Jun), Company Annual Dinner, Health & Safety Training, Fire Drill, Team Building Event, Product Launch Event
- `type` — `holiday`, `event`, `meeting`, `training`
- `visibility` — `all`, `hr`, or `employee`
- `created_by` — HR manager UUID

---

### 31. `notifications`
Columns: `id, user_id, role, type, message, is_read, created_by, created_at, updated_at`

CHECK: `(user_id IS NOT NULL) OR (role IS NOT NULL)`

Seed ~200 notifications:
- Broadcast to role (e.g. `role = 'employee'`): `"Annual leave policy updated for 2026"`, `"Eid ul Fitr holidays announced — March 30–April 1, 2025"`, `"Company turns 36 — Annual Dinner 2026"`, `"New HR policy effective January 2024"``
- Targeted (user_id): leave approval notifications, penalty notifications, attendance reminders
- ~60% `is_read = true`
- `type` — `leave_update`, `attendance_alert`, `system`, `announcement`, `penalty`

---

### 32. `urgent_alerts`
Columns: `id, employee_id, type, expiry_date, status, updated_by, created_at, updated_at`

ENUM CHECK: `status` is `open` or `resolved`

Seed ~80 alerts:
- Types: `contract_expiry` (for contract employees), `probation_end`, `document_expiry`, `medical_exam_due`, `cnic_expiry`
- ~50% open, ~50% resolved
- `expiry_date` — for open alerts: between 2026-05-12 and 2026-08-12 (next 30–90 days from today); for resolved: any past date between 1990-01-01 and 2026-05-11
- `updated_by` — HR manager UUID

---

### 33. `pending_actions`
Columns: `id, employee_id, missing_fields, status, resolved_by, resolved_at, created_at, updated_at`

ENUM CHECK: `status` is `open` or `resolved`  
CHECK: `missing_fields` is a JSONB array.

Seed ~100 pending actions:
- `missing_fields` — examples: `["bank_account", "emergency_contact"]`, `["medical_record"]`, `["cnic_copy", "education_certificate"]`
- ~40% open, ~60% resolved
- `resolved_by` — HR executive UUID (only where resolved)
- `resolved_at` — only where resolved

---

### 34. `directory_entries`
Columns: `id, employee_id, name, email, phone_internal, phone_mobile, phone_mobile_public, role_title, department_id, branch_id, availability, created_by, created_at, updated_at`

ENUM CHECK: `availability` is `available`, `busy`, `out_of_office`

Seed one entry per employee (520 rows):
- `phone_internal` — extension format: `ext-101` through `ext-620`
- `phone_mobile` — same as emergency contact phone
- `phone_mobile_public` — `true` for managers, `false` for others
- `role_title` — their designation title
- `branch_id` — NULL (no `branches` table seen in schema); skip or leave NULL
- `availability` — `available` for ~70%, `busy` for ~20%, `out_of_office` for ~10%
- `created_by` — HR manager UUID

---

### 35. `activity_logs`
Columns: `id, user_id, action, entity_type, entity_id, meta, created_at`

Seed ~300 activity log entries spanning **1990-01-01 through 2026-05-12** (majority in 2015–2026 as digital logs would be sparse pre-2010):
- Login events: `"USER_LOGIN"`, entity_type=`user`
- Employee updates: `"EMPLOYEE_UPDATED"`, entity_type=`employee_info`
- Leave approvals: `"LEAVE_APPROVED"`, entity_type=`leave_requests`
- Attendance locks: `"ATTENDANCE_LOCKED"`, entity_type=`attendance`
- `meta` — JSONB with context: `{"ip": "192.168.1.12", "browser": "Chrome", "changes": ["salary updated"]}`

---

### 36. `audit_logs`
Columns: `id, user_id, action, table_name, record_id, reason, created_at`

CHECK: `action` is `INSERT`, `UPDATE`, or `DELETE`

Seed ~200 audit log entries spanning **1990-01-01 through 2026-05-12** (concentrate in 2010–2026 for realism):
- Actions on employee records, salary updates, penalty applications
- Realistic `reason` values: `"Salary revised for annual increment"`, `"Employee record created during onboarding"`, `"Leave request approved by HR Manager"`

---

### 37. `item_categories`
Columns: `id, category_name, description, created_at`

Seed 12 categories:
- `CCTV Cameras`, `DVR/NVR Systems`, `Access Control`, `Fire Alarm Systems`, `Network Equipment`, `Cables & Accessories`, `Power Supplies & UPS`, `Biometric Devices`, `Intercom Systems`, `Software Licenses`, `Tools & Hardware`, `Consumables`

---

### 38. `products`
Columns: `id, product_name, category_id, product_type, tracking_type, created_at, quantity`

Seed 60+ products:
- `product_type` — ENUM CHECK: `ASSET`, `CONSUMABLE`, `SERVICE`
- `tracking_type` — ENUM CHECK: `SERIAL`, `IMEI`, `NONE`
- CCTV cameras (ASSET, SERIAL): `Hikvision 2MP Bullet Camera`, `Dahua 4MP Dome Camera`, `CP Plus 5MP PTZ Camera`
- DVRs (ASSET, SERIAL): `Hikvision 16CH DVR`, `Dahua 32CH NVR`
- Network (ASSET, SERIAL): `Cisco 24-Port Switch`, `MikroTik RouterBoard`, `UniFi Access Point`
- Cables (CONSUMABLE, NONE): `CAT6 Cable (per meter)`, `HDMI Cable 10m`, `Power Cable 3-pin`
- Software (SERVICE, NONE): `CCTV Annual Maintenance Contract`, `Access Control Software License`
- Tools (CONSUMABLE, NONE): `Cable Ties (pack of 100)`, `RJ45 Connectors (pack of 50)`

---

### 39. `vendors`
Columns: `id, vendor_id, vendor_name, contact_person, phone, email, created_at`

`vendor_id` — format `V-00000001` (trigger-generated, but since we're bypassing triggers in seed, set it manually in that format or insert WITHOUT the vendor_id and let the trigger fire — **check if triggers are enabled in the seed transaction and decide accordingly**).

Seed 20 vendors:
- `Hikvision Pakistan`, `Dahua Pakistan`, `CP Plus Distributor - Karachi`, `Cisco Reseller Pak`, `MikroTik Pakistan`, `Genetec Pakistan`, `Axis Communications`, `Bosch Security Pakistan`, `Honeywell Distributor`, `Pelco Pakistan`, `TP-Link Pakistan`, `D-Link Pakistan`, `ZKTeco Pakistan`, `Suprema Biometrics Pakistan`, `Hanwha Vision Pakistan`, `Ezviz Pakistan`, `Uniview Pakistan`, `IC Realtime Pakistan`, `Milestone Systems`, `Seagate Storage Solutions`

---

### 40. `customers`
Columns: `id, csid, customer_name, company_name, customer_type, phone, email, created_at`

`csid` — format `CS-00000001` through `CS-00000030` (manually set).

Seed 30 customers:
- Mix of corporate clients, government entities, individual clients
- `customer_type` — `Corporate`, `Government`, `Individual`, `SME`
- Realistic Pakistani company names: `Karachi Port Trust`, `Pakistan Steel Mills`, `Lucky Cement`, `Engro Corporation`, `PSO Head Office`, `Habib Bank Limited`, `National Bank HO`, `K-Electric`, `PTCL`, `Wateen Telecom`, `DHA Karachi`, `Bahria Town Projects`, `Gulshan-e-Hadeed`, individual clients with realistic names

---

### 41. `purchase_requests`
Columns: `id, pr_id, requested_by, department_id, status, created_at, approved_by, approved_at, approval_remarks`

`pr_id` — format `PR-YYYY-0001` (use actual year of record, e.g. `PR-2022-0001`, `PR-2024-0007`). Set manually.
CHECK: `status` is `PENDING`, `APPROVED`, or `REJECTED`.

Seed 25 purchase requests spanning **1990-01-01 through 2026-05-12** — sparse in early years, denser post-2010:
- ~70% APPROVED, ~15% PENDING, ~15% REJECTED
- For IT: laptops, network switches; For Operations: tools, cables; For HR: office furniture, stationery

---

### 42. `purchase_request_items`
Columns: `id, purchase_request_id, product_id, product_name, quantity, remarks`

2–4 items per PR. `product_id` must reference a real product.

---

### 43. `purchase_orders`
Columns: `id, po_id, pr_id, vendor_id, created_at, created_by, total_amount`

`po_id` — format `PO-YYYY-0001` matching the year of the corresponding PR. One PO per approved PR.

---

### 44. `purchase_order_items`
Columns: `id, purchase_order_id, product_id, product_name, quantity, unit_price, remarks`

Mirror the PR items with realistic `unit_price` values in PKR.

---

### 45. `grns`
Columns: `id, grn_id, po_id, received_by, created_at`

`grn_id` — format `GRN-YYYY-0001` matching the year of the corresponding PO. One GRN per PO.

---

### 46. `grn_items`
Columns: `id, grn_id, product_id, product_name, quantity_received, remarks`

Mirror PO items. Occasionally `quantity_received < ordered` to simulate partial delivery.

---

### 47. `inventory_items`
Columns: `id, product_id, serial_number, current_status, created_at`

CHECK: `current_status` is `AVAILABLE`, `ALLOCATED`, `INSTALLED`, `RETURNED`, `DAMAGED`

Seed 200 inventory items (only ASSET/SERIAL-tracked products get individual items):
- Serial format: `SN-HIK-YYYY-0001`, `SN-DAH-YYYY-0001`, etc. — use the year the item was received via GRN.
- ~50% AVAILABLE, ~30% ALLOCATED, ~15% INSTALLED, ~3% RETURNED, ~2% DAMAGED

---

### 48. `inventory_movements`
Columns: `id, inventory_item_id, movement_type, reference_type, reference_id, moved_by, remarks, created_at`

CHECK: `movement_type` is `STOCK_IN`, `STOCK_OUT`, `TRANSFER`, `RETURN`

Seed ~400 movements:
- STOCK_IN when GRN received
- STOCK_OUT when delivery order issued
- TRANSFER for inter-office transfers
- `reference_type` — `GRN`, `DELIVERY_ORDER`, `TRANSFER_REQUEST`
- `moved_by` — procurement officer user UUID

---

### 49. `quotations`
Columns: `id, quotation_id, customer_id, status, created_by, created_at, approved_by, approved_at, approval_remarks, total_amount`

`quotation_id` — format `QUO-YYYY-0001` using the year of creation.  
CHECK: `status` is `DRAFT`, `APPROVED`, `REJECTED`.

Seed 20 quotations:
- ~60% APPROVED, ~25% DRAFT, ~15% REJECTED
- `total_amount` — sum of line items (you'll compute this)

---

### 50. `quotation_items`
Columns: `id, quotation_id, quantity, unit_price, product_id`

2–5 items per quotation. Realistic unit prices in PKR.

---

### 51. `delivery_orders`
Columns: `id, do_id, issued_to_type, issued_to_id, issued_by, created_at, approved_by, approved_at, approval_remarks, status, quotation_id`

`do_id` — format `DO-YYYY-0001` using the year of creation.  
CHECK: `issued_to_type` is `EMPLOYEE` or `CUSTOMER`, `status` is `PENDING`, `APPROVED`, `REJECTED`.

Seed 15 delivery orders:
- ~70% APPROVED
- Some issued to `CUSTOMER` (for client projects), some to `EMPLOYEE` (internal allocation)
- `issued_to_id` — UUID of a customer or employee user depending on type

---

### 52. `delivery_order_items`
Columns: `id, delivery_order_id, product_name, quantity, remarks, product_id`

2–4 items per DO.

---

### 53. `invoices`
Columns: `id, invoice_id, quotation_id, created_at, created_by, total_amount, approved_by, approved_at, payment_status, remarks, approval_status`

`invoice_id` — format `INV-YYYY-0001` using the year of creation.  
CHECK: `approval_status` is `PENDING`, `APPROVED`, `REJECTED`; `payment_status` is `UNPAID`, `PAID`.

Seed one invoice per APPROVED quotation:
- ~70% PAID, ~30% UNPAID
- `total_amount` — match quotation total

---

### 54. `invoice_items`
Columns: `id, invoice_id, product_id, quantity, unit_price`

Mirror quotation items.

---


---

## 🔥 GODMODE — ROUTE-AWARE SEEDING STRATEGY

This section overrides the naive "write SQL inserts for everything" approach. You will seed data in two distinct phases and produce one bonus deliverable. Follow this exactly.

---

### PHASE 0 — ROUTE AUDIT (do this before writing any seed code)

**Step 1 — Enumerate every single registered route.**

Read every `*.routes.js` file under `src/modules/`. For each file, extract every route in this format:

```
METHOD  /path/to/endpoint  →  controller.function  →  middleware chain
```

Build a complete flat list. Example output:
```
POST    /api/auth/login                     → auth.controller.login           → [validateBody]
POST    /api/employees                      → employees.controller.create      → [authenticate, requirePermission('employees:write'), validateBody]
GET     /api/employees/:id                  → employees.controller.getById     → [authenticate, requirePermission('employees:read')]
PUT     /api/employees/:id/job-info         → employees.controller.updateJobInfo → [authenticate, requirePermission('employees:write')]
...
```

**Step 2 — For every POST / PUT / PATCH route, read its controller + service** and extract the exact request body shape it accepts, including:
- Required fields
- Optional fields
- Field types and formats
- Any fields the backend auto-generates (do NOT send these in the API call)
- Auth requirements (JWT Bearer token needed? Which permission key?)

**Step 3 — Categorize every route as one of:**
- `HAS_ROUTE` — a POST/PUT/PATCH exists that can create or upsert this data
- `NO_ROUTE` — no write endpoint exists; data can only be inserted via raw SQL

---

### PHASE 0.5 — BOOTSTRAP VIA POOL QUERIES (permissions → roles → role_permissions → super_admin user)

> ⚠️ This phase runs **before any HTTP call is made**. Without it, `/api/auth/login` will fail because there is no user, no role, and no permissions in the DB.

**Step 1 — Read all permission sources before writing a single row.**

Check ALL of the following and build a deduplicated master list of every permission key the system uses:
- `scripts/seed-permissions.js` — may contain the canonical permission key list
- `src/middleware/permission-middleware.js` and `src/middleware/require-permission.js` — every `requirePermission('key')` call reveals a permission key the system checks
- Every `*.routes.js` file — scan every middleware invocation for permission key strings
- `migrations/1712620818000_add_salary_allowance_permissions.sql` — may add extra permission keys beyond the base set
- Any other migration file that inserts into the `permissions` table

After reading all sources, produce the **final deduplicated permission key list**. Do NOT hardcode the list from this prompt — derive it from the actual codebase. The prompt's list is a hint, the codebase is the truth.

**Step 2 — Via Pool query: insert permissions.**

```js
async function bootstrapPermissions(client) {
  // Derive permissionKeys array from codebase audit above
  const permissionKeys = [ /* all keys found in codebase */ ];

  // Check what already exists (in case of partial seed)
  const existing = await client.query('SELECT permission_key FROM permissions');
  const existingSet = new Set(existing.rows.map(r => r.permission_key));

  const toInsert = permissionKeys.filter(k => !existingSet.has(k));
  if (toInsert.length === 0) {
    console.log('  ✓ All permissions already present');
    return;
  }

  const values = toInsert.map((k, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
  const params = toInsert.flatMap(k => [k, `Permission for ${k}`]);
  await client.query(
    `INSERT INTO permissions (id, permission_key, description, created_at)
     SELECT gen_random_uuid(), k, d, NOW()
     FROM UNNEST($1::text[], $2::text[]) AS t(k, d)
     ON CONFLICT (permission_key) DO NOTHING`,
    // OR use individual parameterized inserts if UNNEST causes issues
  );
  console.log(`  ✓ Inserted ${toInsert.length} permissions`);
}
```

**Step 3 — Via Pool query: insert roles.**

Read `src/modules/config/config.service.js` and `config.routes.js` to confirm the exact role structure the app expects. Then insert:
- `super_admin` (department_id = NULL)
- `hr_manager`, `hr_executive` (HR dept)
- `it_manager` (IT dept)
- `swe_manager`, `tech_lead` (Software Engineering dept)
- `sales_manager` (Sales dept)
- `procurement_manager` (Procurement dept)
- `finance_manager` (Finance dept)
- `operations_manager` (Operations dept)
- `employee` (department_id = NULL)

Use `ON CONFLICT DO NOTHING` so re-runs are safe.

**Step 4 — Via Pool query: wire role_permissions.**

For each role, assign permissions by querying the permission IDs just inserted:

```js
// Example — super_admin gets ALL permissions
await client.query(`
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT $1, id FROM permissions
  ON CONFLICT DO NOTHING
`, [superAdminRoleId]);

// employee gets minimal set
const employeeKeys = ['leave:read', 'leave:write', 'attendance:read', 'notifications:read', 'calendar:read', 'directory:read'];
await client.query(`
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT $1, id FROM permissions WHERE permission_key = ANY($2::text[])
  ON CONFLICT DO NOTHING
`, [employeeRoleId, employeeKeys]);
```

Verify after insert: run `SELECT COUNT(*) FROM role_permissions` and log the count. If it is 0, abort — something went wrong.

**Step 5 — Via Pool query: insert the super_admin user.**

This user must exist before `POST /api/auth/login` is called in Phase 1.

```js
const hashedPassword = await bcrypt.hash('SuperAdmin@123!', 12);
await client.query(`
  INSERT INTO users (id, employee_id, email, password, role_id, must_change_password, created_at, updated_at)
  VALUES (gen_random_uuid(), 'EMP-0001', 'superadmin@esspl.com.pk', $1, $2, false, NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
`, [hashedPassword, superAdminRoleId]);
```

> Note: `employee_id = 'EMP-0001'` must reference a real row in `employee_info`. Insert a minimal `employee_info` row for EMP-0001 (the CEO / super admin) right before this step if `employee_info` is not yet seeded.

**Step 6 — Verify the full bootstrap before proceeding.**

Run these checks via Pool and abort if any fail:

```js
const checks = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM permissions)        AS perm_count,
    (SELECT COUNT(*) FROM roles)              AS role_count,
    (SELECT COUNT(*) FROM role_permissions)   AS rp_count,
    (SELECT COUNT(*) FROM users WHERE email = 'superadmin@esspl.com.pk') AS admin_exists
`);
const { perm_count, role_count, rp_count, admin_exists } = checks.rows[0];
console.log(`  Bootstrap check — permissions: ${perm_count}, roles: ${role_count}, role_permissions: ${rp_count}, admin: ${admin_exists}`);
if (parseInt(perm_count) === 0) throw new Error('BOOTSTRAP FAILED: no permissions inserted');
if (parseInt(role_count) === 0) throw new Error('BOOTSTRAP FAILED: no roles inserted');
if (parseInt(rp_count) === 0) throw new Error('BOOTSTRAP FAILED: no role_permissions inserted');
if (parseInt(admin_exists) === 0) throw new Error('BOOTSTRAP FAILED: super_admin user not found');
console.log('  ✓ Bootstrap verified — safe to proceed to Phase 1 API login');
```

Only after Step 6 passes does Phase 1 begin.

---

### PHASE 1 — SEED VIA API (for all HAS_ROUTE tables)

For every table that has a corresponding `HAS_ROUTE` write endpoint:

1. **Start the server** (or import app directly) to get a running HTTP listener, OR use the `pg` Pool directly to call the same service functions — whichever approach avoids circular dependency issues. **Preferred: direct HTTP calls using `fetch` (Node 18+ built-in)** against `http://localhost:{PORT}` so the full middleware chain (validation, permission checks, sanitization, business logic) runs exactly as it would in production.

2. **Authenticate first.** Before inserting any data, call:
   ```
   POST /api/auth/login
   Body: { email: "superadmin@esspl.com.pk", password: "SuperAdmin@123!" }
   ```
   Store the returned JWT token. Use it as `Authorization: Bearer <token>` on every subsequent request.

3. **Insert in FK-dependency order** (same order as the TABLE-BY-TABLE section). For each record:
   - Build the payload using ONLY the fields the route accepts
   - Make the HTTP request
   - **Capture the returned `id` / `uuid`** from the response and store it in a JS Map for use as FK references in later inserts
   - On non-2xx response: log the full error body and abort with a clear message — do NOT silently continue

4. **Batch strategy for large tables:**
   - For tables with ≤ 50 records: sequential `await fetch(...)` calls
   - For tables with 51–500 records: parallel batches of 10 using `Promise.allSettled`
   - For tables with 500+ records (employees, attendance, leave_balances): parallel batches of 25, with a 100ms delay between batches to avoid overwhelming the server

5. **Token refresh:** If seeding takes long enough that the JWT expires, re-authenticate and update the stored token before continuing.

Example pattern:
```js
// Authenticate
const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'superadmin@esspl.com.pk', password: 'SuperAdmin@123!' })
});
const { token } = await loginRes.json();
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// Insert a department and capture its ID
const deptRes = await fetch(`${BASE_URL}/api/config/departments`, {
  method: 'POST', headers,
  body: JSON.stringify({ department_name: 'Software Engineering', department_code: 'DEPT-SWE', is_active: true })
});
const { data: { id: sweDeptId } } = await deptRes.json();
idMap.set('dept_swe', sweDeptId); // store for FK use
```

---

### PHASE 2 — SEED VIA POOL QUERIES (for all NO_ROUTE tables)

For every table that has NO write endpoint (`NO_ROUTE`), insert data directly using the `pg` Pool client inside a single transaction:

```js
await client.query('BEGIN');
// ... all NO_ROUTE inserts ...
await client.query('COMMIT');
```

Rules:
- Use parameterized queries only — NO string interpolation into SQL
- Reference IDs captured in Phase 1 via the `idMap` (e.g. `idMap.get('dept_swe')`)
- Use batch `INSERT INTO ... VALUES ($1,$2,...),($3,$4,...)` for tables with many rows (attendance, leave_balances, etc.)
- Commit in chunks of 500 rows for large tables

---

### PHASE 3 — MISSING ROUTES REPORT (bonus deliverable)

After completing the route audit in Phase 0, generate a file called **`docs/MISSING_ROUTES.md`** at the project root.

**Format:**

```markdown
# Missing Routes Report
Generated: 2026-05-12
Audited by: master_seed.js route audit

## Summary
- Total routes found: XX
- Tables seeded via API: XX
- Tables seeded via Pool query (no route): XX

---

## Missing Routes

### 1. [Table Name] — [HTTP Method] [Suggested Path]

**Why it's needed:**
[1–2 sentences explaining what this endpoint would do and why it matters for the ERP]

**Suggested request body:**
\`\`\`json
{
  "field": "type/description"
}
\`\`\`

**Suggested response:**
\`\`\`json
{
  "success": true,
  "data": { "id": "uuid" }
}
\`\`\`

**Priority:** HIGH / MEDIUM / LOW

**Seeded via:** Pool query (bypassed for now)

---
```

For each missing route, assess priority:
- `HIGH` — core HR/ERP operation that front-end would definitely need (e.g. creating salary records, allowances, leave balances directly)
- `MEDIUM` — useful but may be handled indirectly (e.g. audit log creation is usually automatic)
- `LOW` — admin/internal use, can be done via DB admin tools

Cover at minimum these likely-missing areas based on the schema:
- `employee_salary` create/update endpoint
- `employee_allowances` create/update endpoint
- `employee_bank_accounts` create/update endpoint
- `employee_medical` create/update endpoint
- `leave_balances` direct set/adjust endpoint
- `leave_policies` create/update endpoint
- `leave_capacity_config` create/update endpoint
- `penalty_rules` CRUD endpoint
- `employee_job_history` create endpoint
- `audit_logs` manual entry endpoint
- `activity_logs` manual entry endpoint
- `inventory_items` create endpoint
- `inventory_movements` record endpoint
- `grns` / `grn_items` create endpoint
- `purchase_order_items` standalone endpoint
- `quotation_items` standalone endpoint
- `delivery_order_items` standalone endpoint
- `invoice_items` standalone endpoint
- `urgent_alerts` create endpoint
- `pending_actions` create endpoint
- `directory_entries` create/sync endpoint

**Cross-check:** Before marking a route as missing, triple-check all route files — some endpoints may handle nested resources in a single POST body (e.g. creating an employee might also accept `job_info`, `bank_account`, `emergency_contact` in the same payload). If so, note this in the report as "handled via nested payload on `POST /api/employees`".

---

### PHASE 4 — SEED FILE STRUCTURE

The output file `seeds/master_seed.js` must be structured as:

```js
import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcrypt'; // or bcryptjs — match package.json

// ── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const idMap = new Map(); // stores all captured IDs for FK cross-references

// ── PHASE 1: API-based inserts (HAS_ROUTE tables) ───────────────────────────
async function seedViaAPI() { ... }

// ── PHASE 2: Pool-based inserts (NO_ROUTE tables) ───────────────────────────
async function seedViaPool() { ... }

// ── TRUNCATE (run before both phases) ───────────────────────────────────────
async function truncateAll() { ... }

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting ESSPL master seed — 1990 to 2026-05-12');
  const client = await pool.connect();
  try {
    await truncateAll();
    console.log('✓ All tables truncated');

    // Phase 0.5 — bootstrap must run first, before ANY API call
    await client.query('BEGIN');
    await bootstrapPermissions(client);  // permissions
    await bootstrapRoles(client);        // roles + role_permissions
    await bootstrapSuperAdmin(client);   // super_admin user (EMP-0001)
    await bootstrapVerify(client);       // abort if anything missing
    await client.query('COMMIT');
    console.log('✓ Phase 0.5 complete — permissions, roles, role_permissions, super_admin bootstrapped');

    await seedViaAPI();
    console.log('✓ Phase 1 complete — API seeding done');
    await seedViaPool();
    console.log('✓ Phase 2 complete — Pool seeding done');
    console.log('🎉 Seed complete. ESSPL ERP is ready.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('💥 Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
```

---

### GODMODE CHECKLIST

Before outputting any file, verify:
- [ ] All permission sources read: `scripts/seed-permissions.js`, all `*.routes.js` middleware calls, all migrations — master permission key list derived from codebase, not hardcoded
- [ ] Phase 0.5 bootstrap runs BEFORE any HTTP call: permissions → roles → role_permissions → super_admin user
- [ ] Bootstrap verify check passes (perm_count > 0, role_count > 0, rp_count > 0, admin_exists = 1)
- [ ] Every route in every `*.routes.js` file has been read and categorized HAS_ROUTE / NO_ROUTE
- [ ] Phase 1 uses real HTTP fetch calls with proper JWT auth, not direct DB writes
- [ ] Every response ID from Phase 1 is captured in `idMap` before moving to the next table
- [ ] Phase 2 uses parameterized Pool queries only
- [ ] `docs/MISSING_ROUTES.md` is generated with every NO_ROUTE table documented
- [ ] No table is left unseeded
- [ ] The full date range 1990-01-01 through 2026-05-12 is reflected everywhere

---

## CRITICAL CONSTRAINTS — VIOLATING ANY = RUNTIME ERROR

1. **FK order** — Insert tables in this exact order to avoid FK violations:
   `departments → designations → employment_types → job_statuses → work_modes → work_locations → shifts → permissions → roles → role_permissions → employee_info → job_info → employee_job_history → users → emergency_contacts → employee_medical → employee_bank_accounts → allowance_types → employee_salary → employee_allowances → leave_types → leave_policies → leave_balances → leave_capacity_config → leave_requests → penalty_rules → employee_penalties → calendar_events → notifications → urgent_alerts → pending_actions → directory_entries → activity_logs → audit_logs → item_categories → products → vendors → customers → purchase_requests → purchase_request_items → purchase_orders → purchase_order_items → grns → grn_items → inventory_items → inventory_movements → quotations → quotation_items → delivery_orders → delivery_order_items → invoices → invoice_items`

2. **UUIDs** — Declare UUIDs as JavaScript variables at the top of the seed (e.g. `const deptHRId = uuidv4()`) so FK references work within the seed without DB round-trips. OR use `gen_random_uuid()` in raw SQL with CTE/RETURNING patterns for cross-table references.

3. **ENUM / CHECK constraints** — Every value must exactly match what the DB enforces. Re-read every CHECK constraint before writing data.

4. **Unique constraints** — `employee_id`, `cnic`, `email`, `iban`, `account_number` must all be globally unique.

5. **attendance `state`** — ENUM CHECK strictly: only `draft`, `saved`, `submitted`, `locked`, `ho_unlocked`. No other values.

6. **leave_requests dates** — `end_date >= start_date` is enforced by a CHECK constraint. Never violate.

7. **leave_requests `end_by_force`** — CHECK: `end_by_force IS NULL OR (end_by_force >= start_date AND end_by_force <= end_date)`.

8. **`employee_salary` `is_current`** — Only ONE row per employee can have `is_current = true`.

9. **`pending_actions.missing_fields`** — Must be a valid JSONB array: `'["field1","field2"]'::jsonb`.

10. **`notifications` target check** — Either `user_id IS NOT NULL` OR `role IS NOT NULL` (not both null).

11. **`directory_entries.availability`** — Only: `available`, `busy`, `out_of_office`.

12. **TRUNCATE before insert** — Truncate ALL tables in reverse FK order (or use CASCADE) before starting inserts, so re-running the seed is idempotent.

13. **`roles.department_id`** — Run `ALTER TABLE roles ALTER COLUMN department_id DROP NOT NULL;` before inserting `super_admin` and `employee` roles with NULL department_id.

14. **Batch INSERT for attendance** — Do NOT write 44,000 individual insert statements. Use a JS loop that builds batched `INSERT INTO ... VALUES ($1,$2,...),($3,$4,...)` with pg driver parameterized queries, committing in chunks of 500.

15. **bcrypt** — Hash passwords asynchronously. Do not hash inside SQL.

---

## CODE QUALITY REQUIREMENTS

- Use `async/await` throughout. No callbacks.
- Wrap the main seeding in a single `try/catch/finally` with `await client.query('ROLLBACK')` in catch.
- `console.log` progress after each major section: `"✓ Departments seeded"`, `"✓ 520 employees seeded"`, etc.
- `pool.end()` in a `finally` block.
- Handle sequence resets: after truncating, run `SELECT setval('public.customer_seq', 1, false)` and similar for all sequences.
- All string interpolation into SQL must use parameterized queries (`$1, $2...`) — NO string concatenation into SQL (SQL injection risk, even in seed).
- The file must be runnable as: `node seeds/master_seed.js` from the project root (with `"type": "module"` in package.json).

---

## FINAL VERIFICATION CHECKLIST

Before outputting the file, verify internally:
- [ ] Every table in the schema has a seed section
- [ ] Every non-nullable column is populated
- [ ] Every CHECK constraint is satisfied
- [ ] Every FK reference uses a UUID that was actually inserted earlier in the seed
- [ ] No duplicate unique values (employee_id, cnic, email, iban)
- [ ] `employee_salary` has exactly one `is_current = true` per employee
- [ ] Attendance batch insert handles PKR > 40,000 rows correctly
- [ ] All ENUMs match their exact values from the schema
- [ ] File uses `import` syntax (ES Module)
- [ ] TRUNCATE order is correct (children before parents)
- [ ] INSERT order is correct (parents before children)

---

*This prompt was generated from full codebase structure analysis of `C:\Users\zaidb\OneDrive\Desktop\EMS\backend` for the ESSPL ERP system.*
