# EMS ERP — Backend Task List
**INSTRUCTION TO IDE AI:**
Before executing ANY task, read both of these files in full and keep them in context for every task:
- `EMS-ERP-Architecture.md`
- `EMS-ERP-Requirements-V3.md`

When told "start executing", begin at TASK-B001 and work sequentially. Do not skip tasks. Do not combine tasks. Complete one fully before moving to the next. After each task, confirm what was created/modified and wait for "next" or "continue".

---

## GLOBAL CONSTRAINTS (apply to every single task)
- Runtime: Node.js ES Modules only. `import`/`export` everywhere. No `require()`, no `module.exports`.
- File naming: kebab-case always. e.g. `calendar-event-routes.js`, `calendar-event-services.js`
- Validation: Every POST/PUT/PATCH route validates request body with a Zod schema before any DB call.
- No delete: No `DELETE` HTTP method. No `.delete()` or `DROP` in any service or migration UP section.
- HTTP codes: `200` success, `201` created, `400` malformed, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict/state violation, `422` Zod validation failure, `500` unhandled.
- Response envelope always: `{ success: true, data: ... }` or `{ success: false, error: { code: "ERROR_CODE", message: "..." } }`
- Employee FK: All HCM table FKs use `employee_id varchar(10)` referencing `employee_info.employee_id` — NOT the UUID `id` column.
- DB: Use `pg` Pool from `src/config/db.js`. Parameterized queries only. No raw string interpolation in SQL.
- All migrations have both `-- Up Migration` and `-- Down Migration` sections.
- Timestamps: Every new table gets `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()` plus an `update_updated_at_column()` trigger (this trigger function already exists in DB).

---

## PHASE 1 — MIGRATIONS

### TASK-B001 — Migration 009: Users Auth Fields
**Refs:** Architecture §2 (Gap Migrations), Requirements V3 §Module 4  
**Files to create:**
- `migrations/1712620809000_users_auth_fields.sql`

**Build:**
```sql
-- Up Migration
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Down Migration
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS must_change_password;
```
Run this migration against the DB after creating the file. Confirm the columns exist on `users`.

---

### TASK-B002 — Migration 010: Departments `is_active` + `updated_at`
**Refs:** Architecture §2, Requirements V3 §Module 5 (Hard Rules: `is_active` universal)  
**Files to create:**
- `migrations/1712620810000_departments_is_active.sql`

**Build:**
```sql
-- Up Migration
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
ALTER TABLE public.departments
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS is_active;
```
Run migration. Confirm columns exist.

---

### TASK-B003 — Migration 011: Attendance Branch-Lock State Machine
**Refs:** Architecture §2, Requirements V3 §Module 1.2, 1.6  
**Files to create:**
- `migrations/1712620811000_attendance_branch_lock.sql`

**Build:**
```sql
-- Up Migration
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS state varchar(20) NOT NULL DEFAULT 'draft'
    CONSTRAINT attendance_state_check CHECK (state IN ('draft','saved','submitted','locked','ho_unlocked')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS unlock_reason text,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS unlocked_at,
  DROP COLUMN IF EXISTS unlock_reason,
  DROP COLUMN IF EXISTS unlocked_by,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS state;
```
Run migration. Confirm columns exist on `attendance`.

---

### TASK-B004 — Migration 012: Penalty Engine Tables
**Refs:** Architecture §2, Requirements V3 §Module 2.3  
**Files to create:**
- `migrations/1712620812000_penalty_engine.sql`

**Build:**
```sql
-- Up Migration
CREATE TABLE public.penalty_rules (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(100) NOT NULL,
  amount_pkr   numeric(10,2) NOT NULL CHECK (amount_pkr >= 0),
  type         varchar(20)  NOT NULL CHECK (type IN ('flat','percentage')),
  is_active    boolean      NOT NULL DEFAULT true,
  created_by   uuid         REFERENCES public.users(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_penalties (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         varchar(10)  NOT NULL REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
  rule_id             uuid         NOT NULL REFERENCES public.penalty_rules(id),
  date                date         NOT NULL,
  reason              text,
  status              varchar(20)  NOT NULL DEFAULT 'pending'
    CONSTRAINT employee_penalties_status_check CHECK (status IN ('pending','approved','rejected')),
  proposed_by         uuid         REFERENCES public.users(id),
  submitted_to_ho_at  timestamptz,
  reviewed_by         uuid         REFERENCES public.users(id),
  reviewed_at         timestamptz,
  review_note         text,
  employee_ack        boolean      NOT NULL DEFAULT false,
  employee_acked_at   timestamptz,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_penalty_rules_updated_at
  BEFORE UPDATE ON public.penalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employee_penalties_updated_at
  BEFORE UPDATE ON public.employee_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_penalties_employee ON public.employee_penalties(employee_id);
CREATE INDEX idx_penalties_status ON public.employee_penalties(status);

-- Down Migration
DROP TRIGGER IF EXISTS trg_employee_penalties_updated_at ON public.employee_penalties;
DROP TRIGGER IF EXISTS trg_penalty_rules_updated_at ON public.penalty_rules;
DROP INDEX IF EXISTS idx_penalties_status;
DROP INDEX IF EXISTS idx_penalties_employee;
DROP TABLE IF EXISTS public.employee_penalties;
DROP TABLE IF EXISTS public.penalty_rules;
```
Run migration. Confirm both tables exist.

---

### TASK-B005 — Migration 013: Leave Capacity Config
**Refs:** Architecture §2, Requirements V3 §Module 5.4  
**Files to create:**
- `migrations/1712620813000_leave_capacity_config.sql`

**Build:**
```sql
-- Up Migration
CREATE TABLE public.leave_capacity_config (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid    NOT NULL REFERENCES public.departments(id),
  max_percent   int     NOT NULL DEFAULT 50 CHECK (max_percent BETWEEN 1 AND 100),
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid    REFERENCES public.users(id),
  updated_by    uuid    REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id)
);

CREATE TRIGGER trg_leave_capacity_config_updated_at
  BEFORE UPDATE ON public.leave_capacity_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_leave_capacity_config_updated_at ON public.leave_capacity_config;
DROP TABLE IF EXISTS public.leave_capacity_config;
```
Run migration.

---

### TASK-B006 — Migration 014: Company Directory
**Refs:** Architecture §2, Requirements V3 §Module 8  
**Files to create:**
- `migrations/1712620814000_directory_entries.sql`

**Build:**
```sql
-- Up Migration
CREATE TABLE public.directory_entries (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         varchar(10)  REFERENCES public.employee_info(employee_id) ON DELETE SET NULL,
  name                varchar(200) NOT NULL,
  email               varchar(200),
  phone_internal      varchar(50),
  phone_mobile        varchar(50),
  phone_mobile_public boolean      NOT NULL DEFAULT false,
  role_title          varchar(200),
  department_id       uuid         REFERENCES public.departments(id),
  branch_id           uuid         REFERENCES public.work_locations(id),
  availability        varchar(50)  CHECK (availability IN ('available','busy','out_of_office')),
  created_by          uuid         REFERENCES public.users(id),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_directory_entries_updated_at
  BEFORE UPDATE ON public.directory_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_directory_department ON public.directory_entries(department_id);
CREATE INDEX idx_directory_branch ON public.directory_entries(branch_id);

-- Down Migration
DROP TRIGGER IF EXISTS trg_directory_entries_updated_at ON public.directory_entries;
DROP INDEX IF EXISTS idx_directory_branch;
DROP INDEX IF EXISTS idx_directory_department;
DROP TABLE IF EXISTS public.directory_entries;
```
Run migration.

---

### TASK-B007 — Migration 015: Activity Logs
**Refs:** Architecture §2, Requirements V3 §Module 9.2  
**Files to create:**
- `migrations/1712620815000_activity_logs.sql`

**Build:**
```sql
-- Up Migration
CREATE TABLE public.activity_logs (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         REFERENCES public.users(id),
  action      text         NOT NULL,
  entity_type varchar(100),
  entity_id   varchar(100),
  meta        jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Down Migration
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_user;
DROP TABLE IF EXISTS public.activity_logs;
```
Run migration. Note: no `updated_at` — this table is append-only, rows are never updated.

---

### TASK-B008 — Seed New Permission Keys
**Refs:** Architecture §2 (Permissions Seed), Requirements V3 §Module 5  
**Files to create:**
- `scripts/seed-permissions.js`

**Build:**
A runnable script (`node scripts/seed-permissions.js`) that inserts the following permission keys using `INSERT ... ON CONFLICT (permission_key) DO NOTHING` so it is safe to run multiple times:

```
calendar:read, calendar:write,
notifications:read, notifications:write,
alerts:read, pending_actions:read,
penalty_rules:write, penalties:propose, penalties:review,
penalties:read_own, penalties:read_all,
leave_capacity:write, leave_capacity:read,
directory:read, directory:write,
config:write,
attendance:submit_ho, attendance:unlock,
attendance:read, attendance:write,
leave:read, leave:write, leave:approve,
employees:read, employees:write,
dashboard:read
```

Script must log each key inserted vs skipped. Use `src/config/db.js` pool.

---

## PHASE 2 — CORE INFRASTRUCTURE

### TASK-B009 — DB Config Module
**Refs:** Architecture §3  
**Files to create:**
- `src/config/db.js`

**Build:**
Export a single `pg` Pool instance. Read `DATABASE_URL` from `process.env`. Set `ssl: false` for local dev (make it configurable via `DB_SSL=true` env var). Export as default named export `pool`.

---

### TASK-B010 — Error Utility
**Refs:** Architecture §6  
**Files to create:**
- `src/utils/errors.js`

**Build:**
- `AppError` class extending `Error` with `statusCode`, `code`, `message`.
- `errorHandler` Express middleware: catches `AppError` and returns `{ success: false, error: { code, message } }` with correct statusCode. Catches unknown errors as `500` without leaking stack trace.
- Export both named.

---

### TASK-B011 — Response Helper
**Refs:** Architecture §6  
**Files to create:**
- `src/utils/respond.js`

**Build:**
Two named exports:
- `sendSuccess(res, data, statusCode = 200)` → sends `{ success: true, data }`
- `sendError(res, code, message, statusCode)` → sends `{ success: false, error: { code, message } }`

---

### TASK-B012 — Auth Middleware
**Refs:** Architecture §5, Requirements V3 §Module 4  
**Files to create:**
- `src/middleware/auth.js`

**Build:**
`verifyToken` middleware:
- Reads `ems_jwt` from `req.cookies` (use `cookie-parser`).
- Verifies JWT with `process.env.JWT_SECRET`.
- Attaches decoded payload to `req.user` (`{ user_id, employee_id, role_id, must_change_password }`).
- If no cookie or invalid token: `401` with code `UNAUTHORIZED`.
- If `must_change_password === true` and route is not `POST /api/auth/change-password`: `403` with code `MUST_CHANGE_PASSWORD`.

---

### TASK-B013 — Permission Middleware
**Refs:** Architecture §7, Requirements V3 §Hard Rules  
**Files to create:**
- `src/middleware/require-permission.js`

**Build:**
`requirePermission(permissionKey)` factory that returns Express middleware. Checks if `req.user.role_id` has the given `permission_key` via a DB join on `role_permissions → permissions`. If not found: `403` with code `FORBIDDEN`. Cache permission lookups per role_id in a simple in-memory Map (invalidated on process restart — acceptable for v1).

---

### TASK-B014 — Zod Validation Middleware
**Refs:** Architecture §6  
**Files to create:**
- `src/middleware/validate.js`

**Build:**
`validate(zodSchema)` factory returning Express middleware. Calls `zodSchema.safeParse(req.body)`. On failure: `422` with code `VALIDATION_ERROR` and `details` array from Zod error issues. On success: replaces `req.body` with parsed data and calls `next()`.

---

### TASK-B015 — Paginate Utility
**Files to create:**
- `src/utils/paginate.js`

**Build:**
`paginate(query, countQuery, params, page = 1, limit = 20)` — runs both queries, returns `{ data, meta: { total, page, limit, pages } }`. Limit capped at 100.

---

### TASK-B016 — Express App Entry Point
**Refs:** Architecture §3  
**Files to create:**
- `src/app.js`

**Build:**
- Setup Express with `express.json()`, `cookie-parser`, CORS (allow `process.env.CLIENT_URL` with `credentials: true`).
- Mount all module routers (stub them as empty for now if not yet built).
- Mount `errorHandler` as last middleware.
- Export `app` as default. `server.js` at root does `app.listen`.

---

## PHASE 3 — AUTH MODULE

### TASK-B017 — Auth Service
**Refs:** Requirements V3 §Module 3.2, 4.1  
**Files to create:**
- `src/modules/auth/auth.service.js`

**Build:**
- `login(email, password)` → find user by email, compare bcrypt hash, return JWT payload. Throws `AppError(401, 'INVALID_CREDENTIALS')` on failure.
- `changePassword(userId, currentPassword, newPassword)` → verify current password is not same as new (throw `409 SAME_PASSWORD`), hash new password, update `users` set `password`, `must_change_password = false`, `password_changed_at = now()`.
- `generateTempPassword()` → returns a 12-char random string with uppercase + lowercase + digit + symbol.
- `hashPassword(plain)` → bcrypt hash with salt rounds 12.

---

### TASK-B018 — Auth Controller + Routes
**Refs:** Requirements V3 §Module 3, 4  
**Files to create:**
- `src/modules/auth/auth.controller.js`
- `src/modules/auth/auth.routes.js`

**Build routes:**

`POST /api/auth/login`
- Body: `{ email: string, password: string }` (Zod validated)
- On success: sign JWT `{ user_id, employee_id, role_id, must_change_password }`, set `ems_jwt` cookie (`httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production'`), set `ems_csrf` cookie (`httpOnly: false, sameSite: 'lax'`) with a random UUID value.
- Return: `{ success: true, data: { user: { id, email, employee_id, must_change_password } } }`

`POST /api/auth/logout`
- Requires `verifyToken`.
- Clears both cookies. Returns `{ success: true, data: null }`.

`GET /api/auth/session`
- Requires `verifyToken`.
- Returns `req.user` decoded payload (no password).

`POST /api/auth/change-password`
- Requires `verifyToken`.
- Body: `{ current_password: string, new_password: string }` (Zod: min 8, must have upper+lower+digit+symbol).
- Calls `auth.service.changePassword`. Returns `{ success: true, data: { message: 'Password changed.' } }`.

---

## PHASE 4 — EMPLOYEE MODULE

### TASK-B019 — Employee Service: Create
**Refs:** Requirements V3 §Module 3.1  
**Files to create:**
- `src/modules/employees/employees.service.js` (start file, add more methods in later tasks)

**Build `createEmployee(data, createdByUserId)`:**
- Accepts: `personalInfo`, `jobInfo`, `salaryInfo`, `accountInfo` (email, phone for WhatsApp link).
- In a single DB transaction:
  1. Generate `employee_id` as `EMP` + zero-padded next sequence number (query MAX employee_id from `employee_info`).
  2. Insert into `employee_info`.
  3. Insert into `job_info`.
  4. Insert into `extra_employee_info` (if provided).
  5. Generate temp password via `auth.service.generateTempPassword()`.
  6. Hash it. Insert into `users` with `must_change_password = true`.
  7. Insert into `directory_entries` auto-populated from profile data.
- Return: `{ employee, tempPassword }` — tempPassword is returned plain once so frontend can build the WhatsApp link.
- Throws `409 DUPLICATE_CNIC` if CNIC exists. Throws `409 DUPLICATE_EMAIL` if email exists.

---

### TASK-B020 — Employee Service: Read
**Files to modify:**
- `src/modules/employees/employees.service.js`

**Build:**
- `getEmployees({ search, department_id, is_active, page, limit })` → paginated list. Join `employee_info` + `job_info` + `departments` + `designations`. If `search` provided, filter by `employee_id ILIKE` or `name ILIKE`. Return flat objects with `employee_id, name, designation_title, department_name, status, date_of_joining`.
- `getEmployeeById(employeeId)` → full profile: all `employee_info`, `extra_employee_info`, `job_info` joined with all lookup tables (designation, department, shift, etc.). Throw `404 NOT_FOUND` if missing.

---

### TASK-B021 — Employee Service: Update
**Files to modify:**
- `src/modules/employees/employees.service.js`

**Build:**
- `updatePersonalInfo(employeeId, data)` → update `employee_info`.
- `updateJobInfo(employeeId, data)` → update `job_info`. Before updating department/designation, insert a row into `employee_job_history` capturing the previous state with `end_date = today`.
- `updateExtraInfo(employeeId, data)` → upsert `extra_employee_info`.
- `resendCredentials(employeeId)` → generate new temp password, hash it, update `users.password` and set `must_change_password = true`. Return `{ tempPassword, whatsappPhone }` so frontend builds the wa.me link.

---

### TASK-B022 — Employee Zod Schemas
**Files to create:**
- `src/modules/employees/employees.schema.js`

**Build Zod schemas:**
- `createEmployeeSchema` — full multi-step form validation (all required fields per V3 §Module 3.1).
- `updatePersonalInfoSchema` — partial personal fields.
- `updateJobInfoSchema` — partial job fields.
- `updateExtraInfoSchema` — contacts, bank, address fields.

---

### TASK-B023 — Employee Controller + Routes
**Files to create:**
- `src/modules/employees/employees.controller.js`
- `src/modules/employees/employees.routes.js`

**Build routes (all require `verifyToken`):**

| Method | Route | Permission | Handler |
|---|---|---|---|
| `GET` | `/api/employees` | `employees:read` | paginated list |
| `GET` | `/api/employees/:employeeId` | `employees:read` | full profile |
| `POST` | `/api/employees` | `employees:write` | create full profile |
| `PATCH` | `/api/employees/:employeeId/personal` | `employees:write` | update personal info |
| `PATCH` | `/api/employees/:employeeId/job` | `employees:write` | update job info (creates history) |
| `PATCH` | `/api/employees/:employeeId/extra` | `employees:write` | upsert extra info |
| `POST` | `/api/employees/:employeeId/resend-credentials` | `employees:write` | resend credentials |

---

## PHASE 5 — CONFIGURATION MODULE

### TASK-B024 — Config Service: Departments
**Files to create:**
- `src/modules/config/config.service.js`

**Build for departments:**
- `getDepartments({ includeInactive = false })` → if `includeInactive` false, filter `is_active = true`.
- `createDepartment({ department_code, department_name, parent_department_id })` → insert. `409` if code exists.
- `updateDepartment(id, data)` → update name/parent/is_active.

**Rule:** `is_active` toggle is update — not delete. No destroy method ever.

---

### TASK-B025 — Config Service: All Other Config Tables
**Files to modify:**
- `src/modules/config/config.service.js`

**Build CRUD methods for each table (same pattern: getAll, create, update):**
- `designations` — fields: `title`, `is_active`
- `employment_types` — fields: `type_name`, `is_active`
- `job_statuses` — fields: `status_name`, `is_active`
- `work_modes` — fields: `mode_name`, `is_active`
- `work_locations` — fields: `location_name`, `is_active`
- `shifts` — fields: `name`, `start_time`, `end_time`, `late_after_minutes`, `is_active`
- `leave_types` — fields: `name`, `is_active`
- `leave_policies` — fields: `department_id`, `leave_type_id`, `days_allowed`, `year`, `is_active`
- `leave_capacity_config` — fields: `department_id`, `max_percent`, `is_active`
- `penalty_rules` — fields: `name`, `amount_pkr`, `type`, `is_active`

For all `getAll` methods: HR callers receive only `is_active = true`. Super Admin callers receive all (pass `isSuperAdmin` boolean).

---

### TASK-B026 — Config Controller + Routes
**Files to create:**
- `src/modules/config/config.controller.js`
- `src/modules/config/config.routes.js`

**Build:** RESTful routes for every config entity from TASK-B025. Pattern:

`GET /api/config/:entity` — `requirePermission('config:read')` — returns list (filtered by is_active based on caller role)  
`POST /api/config/:entity` — `requirePermission('config:write')` — create  
`PATCH /api/config/:entity/:id` — `requirePermission('config:write')` — update (including is_active toggle)  

Where `:entity` maps to: `departments`, `designations`, `employment-types`, `job-statuses`, `work-modes`, `work-locations`, `shifts`, `leave-types`, `leave-policies`, `leave-capacity`, `penalty-rules`.

---

## PHASE 6 — ATTENDANCE MODULE

### TASK-B027 — Attendance Service: Get Sheet
**Files to create:**
- `src/modules/attendance/attendance.service.js`

**Build `getAttendanceSheet(date, locationId, callerEmployeeId, isSuperAdmin)`:**
- Fetches all employees assigned to `locationId` from `job_info`.
- For each employee, joins their shift from `job_info → shifts`.
- Left-joins existing `attendance` rows for that `date`.
- If no attendance row exists for an employee, returns a synthetic row with `status = 'absent'`, `state = 'draft'`.
- If employee has an approved leave on that date (check `leave_requests`), set `status = 'on_leave'`, `notes = 'On approved leave'`, mark notes as read-only.
- Calculates `late_by_minutes` where `check_in` exists and `check_in > shift.start_time + shift.late_after_minutes`.
- Branch HR can only fetch sheets for their own `locationId`. Super Admin can fetch any.

---

### TASK-B028 — Attendance Service: Batch Save
**Files to modify:**
- `src/modules/attendance/attendance.service.js`

**Build `saveAttendanceSheet(date, locationId, rows, markedByUserId)`:**
- `rows`: array of `{ employee_id, check_in, check_out, status, notes }`.
- Validate: sheet must not be in state `submitted` or `locked` — throw `409 SHEET_LOCKED` if so.
- In a single transaction: for each row, `INSERT ... ON CONFLICT (employee_id, date) DO UPDATE` — upsert.
- Set/maintain `state = 'saved'`, `marked_by = markedByUserId`.
- After save, fan out a notification per affected employee: type `attendance_marked`, message `"Your attendance for [date] has been recorded. Status: [status]. Please acknowledge."` — insert into `notifications` table.
- Return `{ saved_count, date, state: 'saved' }`.

---

### TASK-B029 — Attendance Service: Employee Acknowledge
**Files to modify:**
- `src/modules/attendance/attendance.service.js`

**Build `acknowledgeAttendance(attendanceId, employeeId)`:**
- Fetch attendance row. Verify `employee_id` matches session employee (self-only).
- If `state` is `submitted` or `locked`: throw `409 SHEET_LOCKED`.
- Set `ack = true`, `updated_at = now()`.
- Return updated row.

---

### TASK-B030 — Attendance Service: Submit to Head Office
**Files to modify:**
- `src/modules/attendance/attendance.service.js`

**Build `submitSheetToHO(date, locationId, submittedByUserId)`:**
- Validate caller has permission `attendance:submit_ho`.
- Validate all attendance rows for that date + location are in state `saved`. Throw `409 SHEET_NOT_SAVED` if any row is still `draft`.
- Update all matching rows: `state = 'submitted'`, `submitted_by = submittedByUserId`, `submitted_at = now()`.
- Return `{ submitted_count, date, state: 'submitted' }`.

---

### TASK-B031 — Attendance Service: Unlock Flow
**Files to modify:**
- `src/modules/attendance/attendance.service.js`

**Build:**
- `requestUnlock(date, locationId, reason, requestedByUserId)` → inserts a record into `pending_actions` (type: `attendance_unlock_request`) or a simpler approach: creates a notification to HO users with `type = 'unlock_request'` and stores unlock reason. Returns `{ status: 'unlock_requested' }`.
- `approveUnlock(date, locationId, unlockedByUserId, unlockReason)` → requires `attendance:unlock` permission. Updates all rows for date+location: `state = 'ho_unlocked'`, `unlocked_by`, `unlock_reason`, `unlocked_at`. Returns `{ unlocked_count }`.

---

### TASK-B032 — Attendance Service: Monthly Report
**Files to modify:**
- `src/modules/attendance/attendance.service.js`

**Build `getMonthlyReport(year, month, locationId, filters)`:**
- `filters`: optional `{ employee_id, department_id }`.
- Returns array per employee: `{ employee_id, name, designation, presents, absents, lates, half_days, on_leaves, total_working_days, attendance_percent }`.
- `total_working_days` = working days in that month (Mon–Sat by default, or per shift config).
- `attendance_percent` = `(presents + lates + half_days * 0.5) / total_working_days * 100`, rounded to 1 decimal.

---

### TASK-B033 — Attendance Controller + Routes
**Files to create:**
- `src/modules/attendance/attendance.controller.js`
- `src/modules/attendance/attendance.routes.js`

**Routes (all require `verifyToken`):**

| Method | Route | Permission | Handler |
|---|---|---|---|
| `GET` | `/api/attendance?date=&location_id=` | `attendance:read` | get sheet for date+location |
| `PUT` | `/api/attendance/save` | `attendance:write` | batch save sheet |
| `POST` | `/api/attendance/submit` | `attendance:submit_ho` | submit sheet to HO |
| `POST` | `/api/attendance/unlock-request` | `attendance:write` | request unlock |
| `POST` | `/api/attendance/unlock-approve` | `attendance:unlock` | approve unlock (HO only) |
| `PATCH` | `/api/attendance/:id/ack` | (self only, checked in service) | employee ack |
| `GET` | `/api/attendance/report?year=&month=&location_id=` | `attendance:read` | monthly report |

---

## PHASE 7 — LEAVE MODULE

### TASK-B034 — Leave Service: Balances
**Files to create:**
- `src/modules/leave/leave.service.js`

**Build:**
- `getLeaveBalances(employeeId)` → returns all balance rows for that employee for current year. Join `leave_types` for names. Returns `{ leave_type_id, name, balance, used, remaining: balance - used }`.
- `getLeaveBalancesAll({ department_id, location_id, shift_id, year })` → HR view — all employees' balances filtered by optional params.
- `initializeBalances(employeeId, year)` → reads `leave_policies` for employee's department, creates `leave_balances` rows. Called during employee creation and at year rollover.

---

### TASK-B035 — Leave Service: Capacity Check
**Files to modify:**
- `src/modules/leave/leave.service.js`

**Build `checkCapacity(employeeId, startDate, endDate)`:**
- Get employee's department from `job_info`.
- Get `max_percent` from `leave_capacity_config` for that department (default 50 if no row).
- For each day in `startDate → endDate`:
  - Count employees in same department with approved leave covering that day.
  - Get department headcount from `job_info`.
  - If `(on_leave_count / headcount) * 100 >= max_percent` on ANY day: capacity exceeded.
- If exceeded: find top 3 suggested windows (look forward 30 days, find windows with capacity < max_percent).
- Return `{ allowed: boolean, exceeded_dates, suggested_dates }`.

---

### TASK-B036 — Leave Service: Submit Request
**Files to modify:**
- `src/modules/leave/leave.service.js`

**Build `submitLeaveRequest(employeeId, data)`:**
- Validate dates (`end_date >= start_date`).
- Check employee has sufficient balance for the leave type.
- Call `checkCapacity`. If `!allowed`: throw `409 CAPACITY_EXCEEDED` with `{ error: 'capacity_exceeded', department, current_on_leave, capacity_limit, suggested_dates }`.
- Insert into `leave_requests` with `status = 'pending'`.
- Notify HR users (insert into `notifications` with `role = 'hr'`): `"Leave request from [name] for [dates]."`.
- Return created request.

---

### TASK-B037 — Leave Service: Approve / Reject
**Files to modify:**
- `src/modules/leave/leave.service.js`

**Build:**
- `approveLeave(leaveId, reviewedByUserId)`:
  - Set `status = 'approved'`, `reviewed_by`, `reviewed_at`.
  - Deduct balance: increment `leave_balances.used` by days taken.
  - Notify employee via `notifications`.
- `rejectLeave(leaveId, reviewedByUserId, reason)`:
  - Set `status = 'rejected'`, store reason in `notes` (add `rejection_reason text` column if not present — add to migration 013 or a new migration).
  - Notify employee.

---

### TASK-B038 — Leave Service: Early Return
**Files to modify:**
- `src/modules/leave/leave.service.js`

**Build `earlyReturn(leaveId, hrUserId)`:**
- Fetch leave. Must be `status = 'approved'` — else `409`.
- Set `end_by_force = today`.
- `days_taken = today - start_date + 1`.
- `days_restored = original_days - days_taken` where `original_days = end_date - start_date + 1`.
- Decrement `leave_balances.used` by `days_restored` (restore balance).
- Return updated leave with `days_taken`, `days_restored`.

---

### TASK-B039 — Leave Service: Calendar Data
**Files to modify:**
- `src/modules/leave/leave.service.js`

**Build `getLeaveCalendar({ month, year, department_id, branch_id })`:**
- Returns approved leaves within that month.
- Each entry: `{ employee_id, name, department_name, leave_type, start_date, end_date }`.
- HR/Super Admin only. Employees cannot call this endpoint.

---

### TASK-B040 — Leave Controller + Routes
**Files to create:**
- `src/modules/leave/leave.controller.js`
- `src/modules/leave/leave.routes.js`

**Routes (all require `verifyToken`):**

| Method | Route | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/leave-requests` | `leave:read` | all requests, filters: status, employee, dept |
| `GET` | `/api/leave-requests/mine` | (any auth) | self-only requests |
| `POST` | `/api/leave-requests` | (any auth) | submit request — capacity check inside |
| `PATCH` | `/api/leave-requests/:id/approve` | `leave:approve` | approve |
| `PATCH` | `/api/leave-requests/:id/reject` | `leave:approve` | reject |
| `PATCH` | `/api/leave-requests/:id/early-return` | `leave:approve` | early return |
| `GET` | `/api/leave-requests/balances` | `leave:read` | HR all balances |
| `GET` | `/api/leave-requests/balances/mine` | (any auth) | self balances |
| `GET` | `/api/leave-requests/calendar` | `leave:read` | calendar data (HR only) |

---

## PHASE 8 — NOTIFICATIONS MODULE

### TASK-B041 — Notifications Service
**Files to create:**
- `src/modules/notifications/notifications.service.js`

**Build:**
- `getMyNotifications(userId, userRole)` → returns notifications where `user_id = userId` OR `role = userRole`, ordered by `created_at DESC`. Returns `{ notifications, unread_count }`.
- `markRead(notificationId, userId)` → set `is_read = true`. Verify ownership (user_id matches or role matches) — `403` if not.
- `createNotification({ user_id, role, type, message, created_by })` → insert. Either `user_id` or `role` must be provided.

---

### TASK-B042 — Notifications Controller + Routes
**Files to create:**
- `src/modules/notifications/notifications.controller.js`
- `src/modules/notifications/notifications.routes.js`

**Routes:**

| Method | Route | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/notifications` | (any auth) | `?scope=me` — returns own notifications + unread_count |
| `PATCH` | `/api/notifications/:id/read` | (any auth) | mark as read (self-only enforced in service) |
| `POST` | `/api/notifications` | `notifications:write` | HR/Super creates broadcast |

---

## PHASE 9 — CALENDAR EVENTS MODULE

### TASK-B043 — Calendar Events Service + Routes
**Files to create:**
- `src/modules/calendar-events/calendar-events.service.js`
- `src/modules/calendar-events/calendar-events.controller.js`
- `src/modules/calendar-events/calendar-events.routes.js`

**Build:**
- `GET /api/calendar-events?from=&to=` — all authenticated users. Returns events within date range. Employees only see `visibility = 'all'` or `visibility = 'employee'`. HR/Super see all.
- `POST /api/calendar-events` — requires `calendar:write`. Body: `{ type, date, title, visibility }`.
- `PATCH /api/calendar-events/:id` — requires `calendar:write`. Update title, date, visibility.

Zod schema for body validation. `visibility` must be `'all' | 'hr' | 'employee'`.

---

## PHASE 10 — DASHBOARD MODULE

### TASK-B044 — Dashboard Service: HR Metrics
**Files to create:**
- `src/modules/dashboard/dashboard.service.js`

**Build `getHRMetrics(range)`:**
- `range`: `'6m'` or `'12m'` — used for chart data.
- Returns:
```js
{
  total_employees: number,
  new_this_month: number,
  department_count: number,
  present_today: number,
  present_today_percent: number,
  on_leave_today: number,            // approved leaves covering today
  penalties_this_month: { coming_soon: true, count: 0, amount_pkr: 0 },
  attendance_trend: [{ month: 'Jan', present: N, absent: N, late: N }],  // N months
  headcount_trend: [{ month: 'Jan', count: N }],
  upcoming_birthdays: [{ employee_id, name, date_of_birth, days_until }],
  pending_actions: [{ employee_id, name, missing_fields }],
  urgent_alerts: [{ employee_id, name, type, expiry_date, days_remaining }]
}
```
- `upcoming_birthdays`: next 30 days, computed from `employee_info.date_of_birth` (varchar — parse as string).
- `pending_actions`: employees missing `bank_acc_num` OR `emergence_contact_1` OR `postal_address` in `extra_employee_info`.
- `urgent_alerts`: employees whose `job_info.probation_end_date` or `contract_end_date` is within 30 days from today.
- `on_leave_today`: count of `leave_requests` where `status = 'approved'` AND `start_date <= today` AND `end_date >= today`.

---

### TASK-B045 — Dashboard Service: Employee Self Metrics
**Files to modify:**
- `src/modules/dashboard/dashboard.service.js`

**Build `getEmployeeSelfMetrics(employeeId)`:**
Returns:
```js
{
  attendance_summary: { presents: N, absents: N, lates: N, half_days: N, month: 'April 2026' },
  recent_attendance: [{ date, status, check_in, check_out }],   // last 6 working days
  leave_balances: [{ leave_type, balance, used, remaining }],
  leave_requests: [{ id, leave_type, start_date, end_date, status }],
  active_penalties: [{ ...full penalty detail, employee_ack: false }],
  upcoming_birthdays: [{ employee_id, name, date_of_birth, days_until }]  // all company
}
```
- `active_penalties`: `status = 'approved'` AND `employee_ack = false` — full detail join (rule name, amount, proposed_by name, submitted_to_ho_at, reviewed_by name, reviewed_at).

---

### TASK-B046 — Dashboard Controller + Routes
**Files to create:**
- `src/modules/dashboard/dashboard.controller.js`
- `src/modules/dashboard/dashboard.routes.js`

**Routes:**

| Method | Route | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/dashboard/metrics?range=6m` | `dashboard:read` | HR/Super only |
| `GET` | `/api/dashboard/me` | (any auth) | employee self metrics |

---

## PHASE 11 — PENALTY MODULE

### TASK-B047 — Penalty Service: Rules CRUD
**Files to create:**
- `src/modules/penalties/penalties.service.js`

**Build:**
- `getPenaltyRules(isSuperAdmin)` → Super Admin gets all, HR gets only `is_active = true`.
- `createPenaltyRule({ name, amount_pkr, type, created_by })` → Super Admin only. `type` must be `'flat'` or `'percentage'`.
- `updatePenaltyRule(id, data)` → update name/amount/type/is_active.

---

### TASK-B048 — Penalty Service: Propose
**Files to modify:**
- `src/modules/penalties/penalties.service.js`

**Build `proposePenalty({ employee_id, rule_id, date, reason, proposed_by })`:**
- Validate rule exists and `is_active = true`. Throw `404` if not.
- Insert into `employee_penalties` with `status = 'pending'`, `submitted_to_ho_at = now()`.
- Create notification to HO (role-based notification to `super_admin`/HO HR): `"New penalty proposed for [employee_name] by Branch HR. Rule: [rule_name]. Awaiting review."`.
- Return created penalty row.

---

### TASK-B049 — Penalty Service: Approve / Reject
**Files to modify:**
- `src/modules/penalties/penalties.service.js`

**Build:**
- `approvePenalty(penaltyId, reviewedByUserId)`:
  - Set `status = 'approved'`, `reviewed_by`, `reviewed_at = now()`.
  - Notify employee: `notifications` insert with full details text.
  - Return updated row.
- `rejectPenalty(penaltyId, reviewedByUserId, reviewNote)`:
  - Set `status = 'rejected'`, `reviewed_by`, `reviewed_at = now()`, `review_note`.
  - Notify proposing HR user.
  - Return updated row.

---

### TASK-B050 — Penalty Service: Employee Acknowledge
**Files to modify:**
- `src/modules/penalties/penalties.service.js`

**Build `acknowledgeEmployeePenalty(penaltyId, employeeId)`:**
- Verify `employee_id` on the penalty matches the session employee. `403` if not.
- Penalty must be `status = 'approved'`. `409` if not.
- Set `employee_ack = true`, `employee_acked_at = now()`.
- Return updated row.

---

### TASK-B051 — Penalty Controller + Routes
**Files to create:**
- `src/modules/penalties/penalties.controller.js`
- `src/modules/penalties/penalties.routes.js`

**Routes:**

| Method | Route | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/penalty-rules` | `config:write` or `penalties:propose` | Super Admin + HR |
| `POST` | `/api/penalty-rules` | `penalty_rules:write` | Super Admin only |
| `PATCH` | `/api/penalty-rules/:id` | `penalty_rules:write` | Super Admin only |
| `GET` | `/api/penalties` | `penalties:read_all` | all penalties, filters: status, employee |
| `GET` | `/api/penalties/mine` | `penalties:read_own` | self penalties with full detail |
| `POST` | `/api/penalties` | `penalties:propose` | Branch HR propose |
| `PATCH` | `/api/penalties/:id/approve` | `penalties:review` | HO approve |
| `PATCH` | `/api/penalties/:id/reject` | `penalties:review` | HO reject |
| `PATCH` | `/api/penalties/:id/ack` | (self, checked in service) | employee acknowledge |

---

## PHASE 12 — DIRECTORY MODULE

### TASK-B052 — Directory Service + Routes
**Files to create:**
- `src/modules/directory/directory.service.js`
- `src/modules/directory/directory.controller.js`
- `src/modules/directory/directory.routes.js`

**Service methods:**
- `getDirectory({ branch_id, department_id, search, callerRole })`:
  - If `callerRole` is `employee`: hide `phone_mobile` where `phone_mobile_public = false`.
  - HR/Super Admin always see all phone numbers.
  - Default filter: if `branch_id` not provided, return all.
- `createEntry(data, createdBy)` → insert. HR/Super Admin only.
- `updateEntry(id, data, updatedBy)` → update. HR/Super Admin only.
- `autoPopulateFromEmployee(employeeId)` → called after employee creation. Builds directory entry from profile data.

**Routes:**

| Method | Route | Permission |
|---|---|---|
| `GET` | `/api/directory?branch_id=&search=` | (any auth) `directory:read` |
| `POST` | `/api/directory` | `directory:write` |
| `PATCH` | `/api/directory/:id` | `directory:write` |

---

## PHASE 13 — PENDING ACTIONS & URGENT ALERTS

### TASK-B053 — Pending Actions + Urgent Alerts Routes
**Refs:** Architecture §1.3 (Support Tables), Requirements V3 §7.1  
These tables exist. Build read-only endpoints that compute on the fly (don't persist snapshots for v1).

**Add to dashboard routes or create separate:**

`GET /api/pending-actions` — `pending_actions:read` permission — returns employees missing critical profile fields (join `employee_info` + `extra_employee_info`, check for null `bank_acc_num`, `emergence_contact_1`, `postal_address`).

`GET /api/urgent-alerts?days=30` — `alerts:read` permission — returns employees from `job_info` where `probation_end_date` or `contract_end_date` is within next N days. Returns `{ employee_id, name, type: 'probation'|'contract', expiry_date, days_remaining }`.

---

## PHASE 14 — FINAL WIRING

### TASK-B054 — Mount All Routes in app.js
**Files to modify:**
- `src/app.js`

Mount all module routers:
```js
import authRoutes from './modules/auth/auth.routes.js'
import employeeRoutes from './modules/employees/employees.routes.js'
import configRoutes from './modules/config/config.routes.js'
import attendanceRoutes from './modules/attendance/attendance.routes.js'
import leaveRoutes from './modules/leave/leave.routes.js'
import notificationsRoutes from './modules/notifications/notifications.routes.js'
import calendarRoutes from './modules/calendar-events/calendar-events.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import penaltiesRoutes from './modules/penalties/penalties.routes.js'
import directoryRoutes from './modules/directory/directory.routes.js'
// mount all under /api
```

---

### TASK-B055 — API Security Check Script
**Files to create:**
- `scripts/api-security-check.mjs`

**Build:**
Script that programmatically tests every route in the app against these rules:
1. Unauthenticated requests to protected routes return `401`.
2. Employee role cannot access HR routes (returns `403`).
3. HR role cannot access `config:write` routes (returns `403`).
4. All routes return the correct envelope shape.

Logs PASS/FAIL per route. Use `node-fetch` or built-in `fetch`.

---

### TASK-B056 — Environment Variable Documentation
**Files to create:**
- `.env.example`

Document all required env vars:
```
DATABASE_URL=
JWT_SECRET=
NODE_ENV=development
CLIENT_URL=http://localhost:3000
DB_SSL=false
PORT=5000
```

---

### TASK-B057 — Final Backend Integration Test
**Files to create:**
- `scripts/integration-test.mjs`

**Build a sequential smoke test script:**
1. Login as super_admin → get cookie → verify session.
2. Create employee → verify directory entry auto-created.
3. Get attendance sheet for today → save it → submit to HO → verify state = submitted.
4. Submit leave request → verify capacity check response.
5. Create penalty rule → propose penalty → approve penalty.
6. Get dashboard metrics → verify all keys present.
7. Get notifications → mark one read.

Log all results. Exit with code 1 if any step fails.
