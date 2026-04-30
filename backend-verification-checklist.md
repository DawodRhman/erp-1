# EMS ERP Backend — Post-Implementation Verification Checklist

**Run this after ALL tasks (B001–B057) are complete.**
Go section by section. Do not mark anything done until you have actually tested it — not just "code exists."

---

## SECTION 1 — Database (Run in psql or pgAdmin)

### Migrations

- [x] All 15 migration files exist in `/migrations/` folder
- [x] `users` table has `must_change_password boolean` and `password_changed_at timestamptz`
- [x] `departments` table has `is_active boolean` and `updated_at timestamptz`
- [x] `attendance` table has `state`, `submitted_by`, `submitted_at`, `unlocked_by`, `unlock_reason`, `unlocked_at`
- [x] `attendance.state` CHECK constraint only allows: `draft, saved, submitted, locked, ho_unlocked`
- [x] `penalty_rules` table exists with correct columns and `is_active`
- [x] `employee_penalties` table exists with `submitted_to_ho_at`, `employee_ack`, `employee_acked_at`
- [x] `leave_capacity_config` table exists with `UNIQUE (department_id)`
- [x] `directory_entries` table exists with `employee_id varchar(10)` (not UUID)
- [x] `activity_logs` table exists — NO `updated_at` column (append-only)
- [x] All updated_at triggers exist: run `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table;` — confirm triggers on every new table except `activity_logs`

### Permissions Seed

Run this query — count must be 22 or more:

```sql
SELECT COUNT(*) FROM permissions
WHERE permission_key IN (
  'calendar:read','calendar:write','notifications:read','notifications:write',
  'alerts:read','pending_actions:read','penalty_rules:write','penalties:propose',
  'penalties:review','penalties:read_own','penalties:read_all',
  'leave_capacity:write','leave_capacity:read','directory:read','directory:write',
  'config:write','attendance:submit_ho','attendance:unlock','attendance:read',
  'attendance:write','leave:read','leave:write','leave:approve',
  'employees:read','employees:write','dashboard:read'
);
```

- [x] Count matches expected number — no missing keys

### Data Integrity Spot Check

```sql
-- Employee FK pattern — all HCM tables must use varchar(10) not UUID
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('attendance','job_info','leave_requests','leave_balances','employee_penalties','directory_entries')
AND column_name = 'employee_id';
-- All must show: character varying
```

- [x] All `employee_id` columns are `character varying` not `uuid`

---

## SECTION 2 — Auth

### Login

```bash
# Should return 200 + set ems_jwt and ems_csrf cookies
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"your_password"}'
```

- [ ] Response: `{ success: true, data: { user: { id, email, employee_id, must_change_password } } }`
- [ ] `ems_jwt` cookie is present, `httpOnly=true`
- [ ] `ems_csrf` cookie is present, `httpOnly=false`
- [ ] Wrong password → `401` with `{ success: false, error: { code: "INVALID_CREDENTIALS" } }`
- [ ] Missing fields → `422` VALIDATION_ERROR

### Session

```bash
curl -b cookies.txt http://localhost:5000/api/auth/session
```

- [ ] Returns decoded user payload — no password field anywhere in response
- [ ] Without cookie → `401`

### Must Change Password Enforcement

- [ ] Create a user with `must_change_password = true` in DB
- [ ] Login → call any protected route that is NOT `/api/auth/change-password` → must return `403` with code `MUST_CHANGE_PASSWORD`
- [ ] Call `POST /api/auth/change-password` → succeeds → `must_change_password` is now `false` in DB

### Change Password Rules

- [ ] New password same as current → `409 SAME_PASSWORD`
- [ ] New password < 8 chars → `422 VALIDATION_ERROR`
- [ ] New password missing uppercase → `422`
- [ ] New password missing digit → `422`
- [ ] New password missing special char → `422`
- [ ] Valid change → `200`, `password_changed_at` timestamp written to DB

### Logout

- [ ] `POST /api/auth/logout` clears both cookies
- [ ] Calling session after logout → `401`

---

## SECTION 3 — RBAC / Permissions

- [ ] Employee role calling `GET /api/employees` (requires `employees:read`) → `403 FORBIDDEN`
- [ ] HR role calling `POST /api/config/departments` (requires `config:write`) → `403 FORBIDDEN`
- [ ] Super Admin calling same → `200`
- [ ] Unauthenticated call to any protected route → `401 UNAUTHORIZED`
- [ ] Permission cache: same role_id hitting the same endpoint twice → second call uses cache (no second DB query for permissions — add a console.log temporarily to verify)

---

## SECTION 4 — Employee Module

### Create

- [ ] `POST /api/employees` with full valid payload → `201`, all 4 tables written (`employee_info`, `job_info`, `extra_employee_info`, `users`)
- [ ] Verify `users` record has `must_change_password = true`
- [ ] Verify `directory_entries` record auto-created for the new employee
- [ ] Response includes `tempPassword` (visible once)
- [ ] Duplicate CNIC → `409 DUPLICATE_CNIC`
- [ ] Duplicate email → `409 DUPLICATE_EMAIL`
- [ ] Missing required field → `422 VALIDATION_ERROR`
- [ ] If DB write fails mid-transaction → no partial data written (transaction rollback works)

### Read

- [ ] `GET /api/employees?page=1&limit=20` → paginated list with `meta.total`, `meta.pages`
- [ ] `GET /api/employees?search=EMP001` → filters correctly
- [ ] `GET /api/employees/:employeeId` → full profile with all joins (designation name, department name, shift name etc.)
- [ ] Non-existent employee_id → `404 NOT_FOUND`

### Update

- [ ] `PATCH /api/employees/:id/personal` → updates `employee_info`, `updated_at` changes
- [ ] `PATCH /api/employees/:id/job` → updates `job_info` AND writes a row to `employee_job_history` with `end_date = today` for the old values
- [ ] `PATCH /api/employees/:id/extra` → upserts `extra_employee_info` (works for both first-time and update)
- [ ] `POST /api/employees/:id/resend-credentials` → returns `{ tempPassword, whatsappPhone }`, sets `must_change_password = true` in DB

---

## SECTION 5 — Config Module

### is_active Filter

- [ ] Deactivate a department (PATCH `is_active: false`)
- [ ] `GET /api/config/departments` as HR user → deactivated department NOT in response
- [ ] `GET /api/config/departments` as Super Admin → deactivated department IS in response
- [ ] Super Admin with `?filter=inactive` → only inactive records shown
- [ ] Super Admin with `?filter=all` → all records shown

### CRUD for all entities — spot check at least 3:

- [ ] `POST /api/config/departments` → creates, returns `201`
- [ ] `PATCH /api/config/departments/:id` → updates name, returns `200`
- [ ] `PATCH /api/config/shifts/:id` with `is_active: false` → deactivates
- [ ] `POST /api/config/leave-capacity` → creates row for a department
- [ ] Duplicate `department_id` in `leave_capacity_config` → `409 CONFLICT`
- [ ] `POST /api/config/penalty-rules` by HR user → `403` (Super Admin only)

---

## SECTION 6 — Attendance Module

### Get Sheet

- [ ] `GET /api/attendance?date=2026-04-26&location_id=<uuid>` → returns rows for all employees at that location
- [ ] Employee on approved leave that day → row has `status = 'on_leave'`, notes auto-filled, notes marked read-only
- [ ] Employee with no attendance record → synthetic row returned (not empty array)
- [ ] `late_by_minutes` calculated correctly where check_in > shift start + late_after_minutes

### State Machine

- [ ] Fresh sheet → `state = 'draft'`
- [ ] `PUT /api/attendance/save` → all rows state = `'saved'`, notifications sent to employees
- [ ] `PUT /api/attendance/save` on a `submitted` sheet → `409 SHEET_LOCKED`
- [ ] `POST /api/attendance/submit` → all rows state = `'submitted'`
- [ ] `PUT /api/attendance/save` after submit → `409 SHEET_LOCKED`
- [ ] `POST /api/attendance/unlock-approve` by HO → rows state = `'ho_unlocked'`
- [ ] After unlock: `PUT /api/attendance/save` works again

### Employee Acknowledge

- [ ] `PATCH /api/attendance/:id/ack` by the correct employee → `ack = true`
- [ ] Same call by a DIFFERENT employee → `403`
- [ ] Ack after sheet is `submitted` → `409 SHEET_LOCKED`

### Monthly Report

- [ ] `GET /api/attendance/report?year=2026&month=4&location_id=<uuid>` → returns array per employee
- [ ] Each row has: `presents`, `absents`, `lates`, `half_days`, `on_leaves`, `total_working_days`, `attendance_percent`
- [ ] `attendance_percent` formula: `(presents + lates + half_days * 0.5) / total_working_days * 100`

---

## SECTION 7 — Leave Module

### Balances

- [ ] `GET /api/leave-requests/balances/mine` → returns own balances with `remaining = balance - used`
- [ ] `GET /api/leave-requests/balances` by HR → all employees' balances
- [ ] Employee calling HR balances endpoint → `403`

### Capacity Check

- [ ] Submit leave request when dept is at/above capacity → `409` response body has `error: "capacity_exceeded"`, `suggested_dates` array with 3 entries
- [ ] `suggested_dates` are actual future dates (not past), within 30 days forward
- [ ] Submit leave when dept is below capacity → `201 pending`
- [ ] Department with no `leave_capacity_config` row → defaults to 50% cap

### Approve / Reject

- [ ] Approve leave → `leave_balances.used` incremented correctly
- [ ] Approve leave → employee receives notification
- [ ] Reject leave → balance NOT changed
- [ ] Employee calling approve endpoint → `403`

### Early Return

- [ ] Early return on approved leave → `end_by_force = today`
- [ ] `days_restored` correct: `original_days - days_taken`
- [ ] `leave_balances.used` decremented by `days_restored`
- [ ] Early return on pending leave → `409`

### Calendar

- [ ] `GET /api/leave-requests/calendar?month=4&year=2026` → returns approved leaves only
- [ ] Employee calling this endpoint → `403`

---

## SECTION 8 — Notifications

- [ ] After attendance save: employee has a new notification in DB
- [ ] After leave approve: employee has a new notification
- [ ] After penalty approve: employee has a new notification
- [ ] `GET /api/notifications?scope=me` → returns `{ notifications: [...], unread_count: N }`
- [ ] `PATCH /api/notifications/:id/read` by correct user → `is_read = true`
- [ ] Same call by wrong user → `403`
- [ ] `POST /api/notifications` by HR → `201` (broadcast)
- [ ] `POST /api/notifications` by employee → `403`

---

## SECTION 9 — Dashboard

### HR Metrics

- [ ] `GET /api/dashboard/metrics?range=6m` → response has ALL these keys:
  - `total_employees`, `new_this_month`, `department_count`
  - `present_today`, `present_today_percent`
  - `on_leave_today` (count of approved leaves covering today — NOT pending)
  - `penalties_this_month` = `{ coming_soon: true, count: 0, amount_pkr: 0 }`
  - `attendance_trend` (array of 6 months)
  - `headcount_trend` (array of 6 months)
  - `upcoming_birthdays` (next 30 days — parsed from `date_of_birth varchar`)
  - `pending_actions` (employees missing bank/emergency/address fields)
  - `urgent_alerts` (probation/contract ending within 30 days)
- [ ] `range=12m` → `attendance_trend` has 12 entries
- [ ] Employee calling this endpoint → `403`

### Employee Self Metrics

- [ ] `GET /api/dashboard/me` → returns own data only (never another employee's data)
- [ ] `active_penalties` → only `status = 'approved'` AND `employee_ack = false`
- [ ] `active_penalties` includes full detail: proposed_by name, submitted_to_ho_at, reviewed_by name, reviewed_at
- [ ] `recent_attendance` → last 6 working days only

---

## SECTION 10 — Penalty Module

### Rules (Super Admin Only)

- [ ] `POST /api/penalty-rules` by Super Admin → `201`
- [ ] `POST /api/penalty-rules` by HR → `403`
- [ ] Deactivate rule → HR cannot see it in their dropdown (`GET /api/penalty-rules` filtered)

### Propose → Approve Flow

- [ ] Branch HR proposes penalty using active rule → `201`, status = `pending`, `submitted_to_ho_at` set
- [ ] HO HR approves → status = `approved`, `reviewed_by` + `reviewed_at` written
- [ ] Approval triggers notification to employee
- [ ] Employee views `GET /api/penalties/mine` → sees full detail including who proposed and who approved
- [ ] HO rejects → status = `rejected`, `review_note` stored, proposing HR notified

### Employee Acknowledge

- [ ] `PATCH /api/penalties/:id/ack` by correct employee → `employee_ack = true`, `employee_acked_at` set
- [ ] Same call by wrong employee → `403`
- [ ] Ack on non-approved penalty → `409`

---

## SECTION 11 — Directory

- [ ] `GET /api/directory` → all authenticated users can call it
- [ ] Employee response: `phone_mobile` hidden where `phone_mobile_public = false`
- [ ] HR response: `phone_mobile` always visible
- [ ] `?branch_id=<uuid>` filter works
- [ ] `?search=ahmed` filters by name
- [ ] `POST /api/directory` by employee → `403`
- [ ] Auto-populate: after creating new employee, their directory entry exists automatically

---

## SECTION 12 — Pending Actions + Urgent Alerts

- [ ] `GET /api/pending-actions` → only employees missing bank/emergency/address fields returned
- [ ] Employee with complete profile → NOT in pending actions list
- [ ] `GET /api/urgent-alerts?days=30` → employees with probation_end_date or contract_end_date within 30 days
- [ ] `type` field correctly says `probation` or `contract`
- [ ] `days_remaining` is correct

---

## SECTION 13 — Global API Contract

Run these checks across every single endpoint:

- [ ] Every success response has `{ success: true, data: ... }` — no endpoint returns raw data
- [ ] Every error response has `{ success: false, error: { code: "STRING", message: "..." } }` — no endpoint returns `{ message: "..." }` alone
- [ ] No endpoint leaks stack traces or internal error details in production mode (`NODE_ENV=production`)
- [ ] No endpoint has a DELETE HTTP method
- [ ] No service file has a `.delete()` method or `DELETE` SQL
- [ ] All list endpoints return `meta: { total, page, limit, pages }` when paginated
- [ ] No SQL string interpolation — all queries use parameterized `$1, $2` placeholders

---

## SECTION 14 — Security Check Script

```bash
node scripts/api-security-check.mjs
```

- [x] ✅ Script runs without crashing
- [x] All routes return `401` when called without cookies
- [x] All HR-only routes return `403` when called with employee role token
- [x] All Super Admin-only routes return `403` when called with HR role token
- [x] Zero unexpected `200` responses on protected routes without auth

---

## SECTION 15 — Integration Test Script

```bash
node scripts/integration-test.mjs
```

- [x] ✅ Script exits with code `0` (all steps pass)
- [x] Every step logged as PASS
- [x] ✅ No FAIL entries

---

## SECTION 16 — Code Quality (Manual Review)

- [x] ✅ Zero `require()` calls anywhere — ES Modules only (`import`/`export`)
- [x] Zero `localStorage` or `sessionStorage` references in any file
- [x] All file names are kebab-case
- [x] No hardcoded secrets — all secrets read from `process.env`
- [x] `.env.example` exists and documents all required env vars
- [x] `node_modules` is in `.gitignore`
- [x] ✅ No console.log left in production paths (debug logs OK if behind `NODE_ENV !== 'production'` check)

---

## FINAL SIGN-OFF

All sections above must be fully checked before handing off to frontend integration.

If any check fails: fix it before moving on. Do not carry broken behaviour into the frontend phase.
