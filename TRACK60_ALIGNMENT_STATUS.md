# EMS Backend: Track#60 Alignment Status (HCM Scope)

Last reviewed: 2026-04-24

This file is a quick, practical snapshot of:
1) what the backend can do today (implemented),
2) what Track#60 / docs mention that is not implemented yet (gaps),
3) what security hardening is still recommended (backlog).

Scope lock (v1): Employee Info, Attendance, Leave, Departments/config tables, and employee history. No delete operations.
Precedence rule: if any document conflicts, SRS Track#60 (appendix inside `read.md` / `requriments.md`) is the source of truth.

## 1) What Is Implemented (Aligned With Core HCM Path)

### Authentication and RBAC
- JWT-based login (`POST /api/auth/login`).
- Role/permission middleware is enforced on routes (Auth -> Permission -> Validation -> Controller).
- Roles in use: `super_admin`, `hr_manager`, `hr_executive`, `employee`.
- Self-service isolation is enforced for employees (employees can only read their own records on self-service endpoints).

### Employee Management
- Two-step employee creation flow: `employee_info` then `job_info`.
- Employee UUID is the canonical identifier for `GET/PUT /api/employees/:id` (uses `employee_info.id` UUID).
- `GET /api/employees` supports employee self-service (employee role receives only their own record).
- `GET /api/employees/ids` is blocked for employees (HR/super_admin only).

### Configuration Tables (Dropdown Data + Admin Management)
- HR can read configuration data for dropdowns (read-only).
- `super_admin` can create/update configuration rows (manage).
- Config tables covered: departments, designations, employment types, job statuses, work modes, work locations, shifts, leave types, leave policies.

Note: `verification.md` currently describes config GET as `config:manage` (super_admin only). The implemented policy is "HR read-only, super_admin manage". Treat `verification.md` as needing an update for this point.

### Attendance (Daily Sheet + Batch Save + Employee Acknowledgement)
- Daily attendance sheet endpoint exists (`GET /api/attendance/daily`) and returns check-in/check-out plus ack state.
- HR batch save is supported (`POST /api/attendance/batch`).
- Digital attendance acknowledgement is implemented as the employee's action (Track#60 "signature"):
  - Endpoint: `PATCH /api/attendance/:attendanceId/ack`
  - Allowed: the employee for their own record, or `super_admin`
  - Blocked: HR roles (cannot acknowledge on behalf of employee)

### Leave Management
- Leave requests CRUD flow (without delete): create, list, approve/reject, early return.
- Leave balances use `leave_balances.balance` + `leave_balances.used` (schema is aligned and consistent).
- Calendar and balance endpoints exist, and employee self-service filtering is enforced.

### Automated Security Regression Scripts
- `scripts/api-security-check.mjs`:
  - Auto-discovers mounted routes from `server.js`.
  - Runs "every route x every token" RBAC checks.
  - Runs auth bypass checks (no token / bad token).
  - Runs quick injection probes (not a full pentest).
  - Runs deep self-service checks (employee cannot access other employees' data).
- `scripts/route-middleware-audit.mjs`:
  - Verifies that routes include auth + permission middleware, and flags missing validation middleware.

## 2) Track#60 Features Missing / Off-Path (Not Implemented Yet)

Based on Track#60 appendix text and the current `src/` structure:
- Penalty and Fine Engine (HO defines rules, Branch HR proposes, HO approves): missing (no controllers/models/tables for penalties/fines).
- Official Announcements (feed + employee "Read" tracking): missing (no routes/models).
- HR Executive Dashboard (KPI aggregation endpoint): not implemented as a dedicated backend aggregator (some reporting endpoints exist, but not a single KPI dashboard controller).
- Company Directory / Office Phonebook (extensions/landlines + role-based visibility): missing.
- Multi-branch workflow pieces described in Track#60 (Branch-lock daily sheet, submit-to-HO, HO-only unlock): not implemented as a workflow/state machine yet.

## 3) Security and Hardening Backlog (Recommended Next)

These are not "vulnerabilities found" by the runner, but they are important hardening steps:
- Add security headers (e.g., `helmet`) and disable fingerprinting headers (`x-powered-by`).
- Add rate limiting (429) on login and other sensitive endpoints.
- Wire input sanitization middleware globally:
  - `src/middleware/sanitize-middleware.js` exists, but `server.js` does not currently apply it.
- Reduce 500s on malformed inputs:
  - Add Zod validation for path params/query (UUIDs, dates, numbers) so injection-like strings return a stable 4xx instead of crashing.
- Fix the remaining middleware-audit warnings (routes missing `validate()`):
  - `POST /api/leave-balances/employee/:employeeId/initialize`
  - `PATCH /api/leave-balances/:id/adjust`
  - `PATCH /api/attendance/:attendanceId/ack`
  - `PATCH /api/leave-requests/:id/approve`
  - `PATCH /api/leave-requests/:id/reject`
- Add mass-assignment protection on write endpoints (strict allow-list of fields in controllers/services) and include tests in the security runner.
- Add audit logging ("who changed what") for HR/super_admin write actions (Track#60-adjacent operational requirement).

## 4) Known Doc Drift (Needs Update)

These are places where docs do not match the locked decisions / implemented behavior:
- `read.md` and `requriments.md` early sections discuss `Ack` as HR-driven; Track#60 defines it as employee verification/signature, and the backend implements employee-driven ack.
- `verification.md` describes config GET as super-admin-only; implemented behavior is HR read-only + super_admin manage.

