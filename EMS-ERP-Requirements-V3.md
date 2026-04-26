# EMS ERP — Refined Requirements Document V3
**Date:** 2026-04-26  
**Supersedes:** V2 (2026-04-25)  
**Scope:** HCM Core (Attendance, Leave, Employee, Financials, Config, Directory)  
**Precedence:** This document supersedes all previous prompts, notes, and V2. If any conflict exists between this doc and earlier documents, this doc wins.

---

## Hard Rules (Apply to Every Module)

| Rule | Detail |
|---|---|
| No DELETE | No delete route, service, or model method anywhere. All data is append/update-only. |
| `is_active` on all config tables | Super Admin can activate or deactivate any config record. No delete ever. HR sees only `is_active = true` records. Super Admin sees all records with an active/inactive filter. |
| Zod everywhere | All request payloads validated with Zod before any DB operation. |
| Granular HTTP codes | `400` malformed, `401` unauthenticated, `403` forbidden, `409` conflict, `422` validation, `404` not found. Never collapse errors to blanket `200`/`500`. |
| `created_at` + `updated_at` | Every table. Updated-at trigger on every row mutation. |
| No partial modules | If a module is built, it is built completely. A module that depends on another module cannot ship unless its dependency is fully functional. |
| RBAC | `super_admin` → full access. `hr` → HCM operations, reads config. `employee` → self-service only. Config write/activate/deactivate → `super_admin` only. |

---

## Module 1 — Attendance (Branch-Lock Flow)

### 1.1 Roles in This Module

| Actor | Capability |
|---|---|
| Branch HR | Enter/edit attendance for their branch only. Submit to HO. Cannot touch other branches. |
| HO HR / Super Admin | View all branches. Can unlock a submitted sheet if branch requests it. |
| Employee | Acknowledge their own attendance record. Read-only after sheet is submitted. |

### 1.2 Daily Sheet — State Machine

```
DRAFT → SAVED → SUBMITTED → (LOCKED | HO_UNLOCKED → SAVED)
```

| State | Who Sets It | What It Means |
|---|---|---|
| `DRAFT` | System (on sheet open) | HR is actively editing. Nothing persisted yet. |
| `SAVED` | Branch HR — Save Changes | Records persisted. HR can still edit. Employees can acknowledge. |
| `SUBMITTED` | Branch HR — Submit to Head Office | Sheet locked for branch. HO receives it. |
| `LOCKED` | Automatic after HO review window expires | No further changes by anyone without explicit unlock. |
| `HO_UNLOCKED` | HO HR / Super Admin | Branch HR regains edit access for correction. |

### 1.3 Save Changes Button

- Batch-saves the entire day's attendance grid in one request.
- Persists state as `SAVED`.
- After save: each affected employee receives a notification — *"HR recorded your attendance for [date]. Status: Present/Late/Absent. Please acknowledge."*
- Employee acknowledgement (Ack) is enabled while state is `SAVED`.

### 1.4 Submit to Head Office Button

- Changes state `SAVED` → `SUBMITTED`.
- Branch HR can no longer edit any row on this sheet.
- Employees can no longer acknowledge or request a change.
- HO HR / Super Admin see a "Submitted" badge on the sheet.
- HO marks it reviewed (no separate approval flow needed unless an unlock is requested).

### 1.5 Unlock Flow (HO Only)

- Branch HR submits an unlock request with a written reason.
- HO HR / Super Admin approves → state returns to `SAVED` with an audit note.
- Re-edit window: configurable default 24 h (set per attendance unlock config in Config module, not company_settings).
- Re-submission required after corrections.

### 1.6 Data Model Additions

```sql
-- additions to the attendance sheet / daily_attendance table
state         varchar(20)  NOT NULL DEFAULT 'draft'
  CHECK (state IN ('draft','saved','submitted','locked','ho_unlocked')),
submitted_by  uuid         REFERENCES users(id),
submitted_at  timestamptz,
unlocked_by   uuid         REFERENCES users(id),
unlock_reason text,
unlocked_at   timestamptz
```

### 1.7 Fields Per Row

| Field | Source |
|---|---|
| Employee name + designation + emp_id | `employee_info` + `job_info` |
| Shift (Morning/Evening/Night) | `shifts` |
| Expected In | `shifts` |
| Check In / Check Out | HR input |
| Status | HR input: Present / Absent / Late / Half Day / On Leave |
| Late By | Calculated: `check_in − expected_in` (minutes) |
| Notes | HR input for late/absent. Auto-filled read-only if employee is on approved leave. |
| Ack | Employee acknowledgement checkbox. Disabled when state = `SUBMITTED`. |

### 1.8 Filters & Monthly Report

Filters: date, employee, department, location, shift.

Monthly report columns: `Employee | Presents | Absents | Lates | Half Days | On Leaves | Total Working Days | Attendance %`

---

## Module 2 — Financial Module (Penalty, Payroll, Tax)

### 2.1 Complexity Assessment

**Short answer:** Moderately complex — harder than Leave, far simpler than a full accounting ERP.

| Concern | Reality |
|---|---|
| Payroll engine | Complex. Chain: base salary + allowances − deductions − tax − penalties = net pay. Monthly run with reversal support. |
| Tax | Moderate. Pakistan FBR slabs change yearly. Needs a configurable slab table — never hardcoded. |
| Provident Fund | Simple deduction rule once configured per employee. |
| Allowances (Medical, Fuel, HRA, Conveyance) | Simple addition rules once configured. |
| Penalties | Simple deduction ledger. Complexity is in the approval chain, not the math. |
| Reporting | Moderate. Monthly payslip per employee. Aggregate monthly report. |
| Payslip output (v1) | Browser `window.print()` — no PDF library. HR opens payslip page and presses Ctrl+P / Print. What prints is exactly what the screen shows. No server-side PDF generation in v1. |

**Non-negotiable verdict:** Build payroll fully or not at all. A partial payroll (e.g. salary with no tax) produces wrong net pay figures and destroys trust. Do not ship any payroll-facing page until the full calculation chain passes tests end-to-end.

### 2.2 Recommended Build Order (Financial)

Strict sequence — do not skip ahead:

```
Phase F1: Penalty Engine        ← build now (zero payroll dependency)
Phase F2: Salary Config         ← base salary + allowance/deduction config per employee
Phase F3: Tax Config            ← FBR slab table, configurable per year
Phase F4: Payroll Run           ← monthly calculation engine
Phase F5: Payslip View          ← screen-rendered, print via Ctrl+P (window.print)
Phase F6: Reports               ← aggregate monthly reports
```

### 2.3 Phase F1 — Penalty & Fine Engine (Build Now)

#### Approval Flow

```
HO Super Admin defines rules → Branch HR proposes penalty → HO HR/Super Admin approves → Employee notified
```

#### Steps

1. **Super Admin defines penalty rules** (Config → Penalty Rules):
   - Rule name (e.g. "Late Arrival")
   - Amount PKR
   - Type: `flat` or `percentage_of_salary`
   - `is_active` (branch HR only sees active rules in their dropdown)

2. **Branch HR proposes a penalty** on an employee:
   - Selects: employee + penalty rule + date + reason
   - Status set to `pending`
   - Cannot invent a rule — must select from active rules defined by HO

3. **HO HR or Super Admin reviews pending penalties**:
   - Approve → status `approved`, `approved_at` stamped, employee notified
   - Reject → status `rejected`, rejection note stored, proposing HR notified

4. **Employee transparency view** (Penalty tab, self-service):
   - Sees: penalty type, amount, reason, date proposed, date submitted to HO, who proposed it, who approved it, approval date, current status
   - Acknowledges or dismisses — see §7.3 for full alert behaviour

#### Tables

```sql
penalty_rules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(100) NOT NULL,
  amount_pkr   numeric(10,2),
  type         varchar(20)  CHECK (type IN ('flat','percentage')),
  is_active    boolean      NOT NULL DEFAULT true,
  created_by   uuid         REFERENCES users(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
)

employee_penalties (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid        NOT NULL REFERENCES employee_info(id),
  rule_id         uuid        NOT NULL REFERENCES penalty_rules(id),
  date            date        NOT NULL,
  reason          text,
  status          varchar(20) NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  proposed_by     uuid        REFERENCES users(id),
  submitted_to_ho_at timestamptz,    -- when branch HR submitted for HO review
  reviewed_by     uuid        REFERENCES users(id),
  reviewed_at     timestamptz,
  review_note     text,
  employee_ack    boolean     NOT NULL DEFAULT false,
  employee_acked_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

#### RBAC

| Action | Role |
|---|---|
| Create / edit penalty rules | `super_admin` only |
| Propose penalty | `hr` (scoped to own branch) |
| Approve / reject penalty | `hr` at HO level, `super_admin` |
| View own penalties | `employee` (self only) |
| View all penalties | `hr`, `super_admin` |

### 2.4 Phase F2–F6 (Future — Elaborated After F1 Ships)

Key tables to be designed: `salary_components`, `employee_salary_config`, `tax_slabs`, `payroll_runs`, `payroll_line_items`, `payslip_views`.

---

## Module 3 — Employee Account Creation

### 3.1 Multi-Step Creation Form

| Step | Section | Required at Creation |
|---|---|---|
| 1 | Personal Info | Yes |
| 2 | Job Info | Yes |
| 3 | Medical / Emergency / Attachments | Optional (can complete post-onboarding) |
| 4 | Salary Info | Yes (base salary minimum) |
| 5 | Account Creation | Yes — last step |

### 3.2 Account Creation (Step 5)

**Login method:** Email only. No username or employee-ID login.

- Standard employees: company Gmail or personal Gmail.
- Technical roles: Outlook or any email provider. System is provider-agnostic.
- Email uniqueness enforced by `UNIQUE` constraint on `users.email`.

**On form save:**
1. System generates a random temporary password (12+ chars: uppercase + lowercase + digit + symbol).
2. User record created with `must_change_password = true`.
3. Credential delivery via **WhatsApp API** (see §3.3).

### 3.3 Credential Delivery via WhatsApp

**Mechanism (v1 — simplest viable):**
- HR clicks "Send Credentials via WhatsApp."
- System opens `https://wa.me/<employee_phone>?text=<url-encoded message>` in a new tab.
- WhatsApp Web (or app) opens with a pre-filled message containing:
  - Employee name
  - Login URL
  - Temporary password
  - Instruction to change password on first login
- HR reviews the pre-filled message and clicks Send inside WhatsApp.
- No WhatsApp Business API key or server-side integration required in v1.

**Onboarding PDF / Instructions (v1 — Ctrl+P print):**
- System has an "Onboarding Summary" page per employee showing all their details, instructions, and website link.
- HR opens this page and presses Ctrl+P (or clicks a "Print" button that triggers `window.print()`).
- Browser handles the print/save-as-PDF entirely.
- No server-side PDF generation library needed for v1.

**Credential Resend:**
- HR can trigger "Resend Credentials" from the employee profile at any time.
- System generates a new temporary password, sets `must_change_password = true`, and re-opens the WhatsApp pre-fill link.

---

## Module 4 — First Login Security

### 4.1 Approach: `must_change_password` Column

Industry-standard for single-tenant ERP at this scale. A separate table is overkill.

**Columns added to `users`:**

```sql
must_change_password  boolean      NOT NULL DEFAULT true,
password_changed_at   timestamptz
```

**Flow:**
1. Employee logs in with temp password → JWT issued normally.
2. Backend checks `must_change_password` on every authenticated request.
3. If `true`: JWT payload includes `{ must_change_password: true }`.
4. Next.js middleware intercepts ALL routes except `POST /api/auth/change-password` and hard-redirects to `/change-password`.
5. On successful password change: `must_change_password = false`, `password_changed_at = now()`.
6. Employee proceeds to normal session.

### 4.2 Password Rules

- Minimum 8 characters.
- Must include: uppercase, lowercase, digit, special character.
- Cannot match the temporary password.
- Validated on frontend (Zod) and re-validated on backend (Zod) before any DB write.

---

## Module 5 — Configuration System

### 5.1 Access Rules

| Action | `super_admin` | `hr` | `employee` |
|---|---|---|---|
| Create config record | ✅ | ❌ | ❌ |
| Edit config record | ✅ | ❌ | ❌ |
| Activate / Deactivate (`is_active`) | ✅ | ❌ | ❌ |
| Read active records (for dropdowns) | ✅ | ✅ | ❌ |
| See all records incl. inactive | ✅ only | ❌ | ❌ |

### 5.2 `is_active` Rule (Universal Across All Config Tables)

Every configuration table has:

```sql
is_active  boolean  NOT NULL DEFAULT true
```

- `super_admin` sees all records. Config page shows an **Active / Inactive filter** so Super Admin can manage deactivated entries.
- `hr` sees **only `is_active = true`** records in every dropdown (departments, designations, shifts, leave types, etc.).
- No record is ever deleted. Deactivation is the only "removal."

### 5.3 Config Tables (All with `is_active`)

| Table | Who Creates/Edits | Notes |
|---|---|---|
| `departments` | `super_admin` | |
| `designations` | `super_admin` | |
| `job_statuses` | `super_admin` | e.g. Probation, Confirmed, Contract |
| `work_modes` | `super_admin` | e.g. On-site, Remote, Hybrid |
| `work_locations` / branches | `super_admin` | |
| `employment_types` | `super_admin` | e.g. Full-time, Part-time, Intern |
| `shifts` | `super_admin` | |
| `leave_types` | `super_admin` | |
| `leave_policies` | `super_admin` | |
| `leave_capacity_config` | `super_admin` | See §5.4 |
| `penalty_rules` | `super_admin` | See §2.3 |

### 5.4 Leave Capacity Config (Per Department)

Configuration is **per department**, not company-wide.

```sql
leave_capacity_config (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  uuid     NOT NULL REFERENCES departments(id),
  max_percent    int      NOT NULL DEFAULT 50
    CHECK (max_percent BETWEEN 1 AND 100),
  is_active      boolean  NOT NULL DEFAULT true,
  created_by     uuid     REFERENCES users(id),
  updated_by     uuid     REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id)  -- one active config per department
)
```

- `super_admin` creates and edits — one row per department.
- `hr` reads only (sees active configs during leave management).
- If a department has no row in this table, system falls back to a default cap (e.g. 50%) until configured.

### 5.5 Config UI Structure

Route: `/config` (guarded: `super_admin` only)

- Sidebar tabs per category (Departments, Designations, Shifts, Leave Types, Leave Policies, Leave Capacity, Penalty Rules, etc.)
- Each tab: table view + "Add New" button + inline edit.
- Super Admin filter: "Show Active" (default) / "Show Inactive" / "Show All."
- Deactivating a record that is actively in use (e.g. a shift assigned to employees): show a warning modal listing affected employees. Do not block — warn and confirm.

---

## Module 6 — Leave Management

### 6.1 Calendar View (HR / Super Admin Only)

- Full calendar showing all approved leave requests as date-range blocks.
- Block label: employee name. Color-coded by department.
- Filters: branch, department, month, year.
- Employees cannot see this calendar — they only see their own leave history and balances.

### 6.2 Employee Leave Balances (Self-Service)

- Employees can view their own leave balances from their self-dashboard and from the Leave section.
- Visible fields: leave type name, total allocation, days taken, days remaining.
- Read-only. No employee action possible on balances directly.

### 6.3 Capacity Control (Per Department)

Capacity threshold read from `leave_capacity_config` for the requesting employee's department. If no row exists, default = 50%.

#### Leave Request Flow with Capacity Check

```
Employee submits leave request
  → Backend reads leave_capacity_config for employee's department
  → Calculates: approved_on_leave_count / dept_headcount × 100

If result ≥ dept_max_percent:
  → 409 CONFLICT
  → Response body:
    {
      error: "capacity_exceeded",
      department: "Engineering",
      current_on_leave: N,
      capacity_limit: "50%",
      suggested_dates: ["2026-05-12 to 2026-05-14", ...]  ← top 3
    }

If within capacity:
  → status = "pending"  (HR still approves)
```

**Suggested dates logic:** Look forward up to 30 days from requested start date. Find the nearest window where department capacity is below threshold. Return top 3 windows.

**Employees:**
- Cannot see any peer leave data at any point.
- Only receive the capacity-exceeded message + date suggestions.
- Zero information about which colleagues are on leave.

### 6.4 Leave Tabs (HR / Super Admin)

| Tab | Who Sees | Available Actions |
|---|---|---|
| All | HR / Super | Read |
| Pending | HR / Super | Approve / Reject |
| Approved | HR / Super | Early Return |
| Rejected | HR / Super | Read only |
| Calendar | HR / Super | Filter by dept / month / year |
| Balances | HR / Super | Filter by dept / location / shift |

### 6.5 Early Return

- HR clicks Early Return on an approved leave.
- `end_by_force = today`.
- `days_taken = end_by_force − start_date`.
- `days_restored = original_requested_days − days_taken`.
- Leave balance updated immediately.

---

## Module 7 — Dashboard & Alerts

### 7.1 HR / Super Admin Dashboard

**Top metrics row — 4 cards:**

| Card | Data Shown |
|---|---|
| Total Employees | Count + "N new this month" + departments count |
| Present Today | Count + % of total headcount |
| On Leave Today | Count of employees whose approved leave covers today's date (approved only, no pending) |
| Penalties This Month | Total PKR + record count — **Coming Soon** until Phase F1 deployed |

**Sections below metrics:**

| Section | Status |
|---|---|
| Quick Actions (Approve Leave, Mark Attendance, Add Employee) | Build |
| Quick Actions — Record Promotion | Coming Soon |
| Quick Actions — Add Penalty | Coming Soon until Phase F1 |
| Notification Bell (polling dropdown, unread badge) | Build |
| Monthly attendance trend chart (6m / 12m selector) | Build |
| Headcount growth chart | Build |
| Birthday Calendar (next 30 days, sorted by days-until) | Build |
| Pending Actions (employees with missing profile fields) | Build |
| Urgent Alerts (probation/contract end within 30 days) | Build |
| Leave Capacity Alert (see §7.4) | Build |
| Announcements / Events | Coming Soon |
| Recent Activity feed | Coming Soon |

### 7.2 Employee Self Dashboard

| Widget | Status |
|---|---|
| Attendance Summary (Present / Late / Absent this month) | Build |
| Leave Wallet (balance per leave type — see §6.2) | Build |
| Active Penalty Alert (see §7.3) | Build |
| Quick Actions (Apply Leave, View Directory) | Build |
| Attendance section (last 6 days: status, check-in, check-out) | Build |
| Leave Requests table (own only) | Build |
| Upcoming Birthdays (all employees — not private) | Build |
| Upcoming Holidays | Coming Soon |
| My Activity Logs | Coming Soon |
| Payroll / Payslip | Coming Soon |

> **My Team widget:** Removed. Not in SRS, PRD, or stakeholder meetings. Do not build.

### 7.3 Active Penalty Alert Widget (Employee Dashboard)

#### Display Behaviour

- Triggered when employee has ≥1 penalty with `status = 'approved'` and `employee_ack = false`.
- Alert appears on dashboard on **every page load and every login** until `employee_ack = true`. It is driven purely by backend state — not browser storage.
- Alert is displayed prominently in **red**, visually dominant, impossible to miss.

#### Full Details Shown in Alert

| Field | Source |
|---|---|
| Penalty type / rule name | `penalty_rules.name` |
| Amount PKR | `penalty_rules.amount_pkr` |
| Reason | `employee_penalties.reason` |
| Date of offence | `employee_penalties.date` |
| Proposed by | `users.name` via `employee_penalties.proposed_by` |
| Date submitted to Head Office | `employee_penalties.submitted_to_ho_at` |
| Approved by (HO) | `users.name` via `employee_penalties.reviewed_by` |
| Date approved | `employee_penalties.reviewed_at` |
| Current status | `employee_penalties.status` |

#### Employee Actions

| Action | Behaviour |
|---|---|
| **Acknowledge** | Sets `employee_ack = true`, `employee_acked_at = now()`. Alert disappears permanently. |
| **Dismiss** | Closes the alert modal for this session only. Alert re-appears on next page load or login. Widget remains visible in red on dashboard. Employee can still use the rest of the system normally. |

**Key principle:** Dismissing ≠ acknowledging. The employee can dismiss and use the directory, contact HO, apply for leave, etc. The persistent red widget is always visible until they formally acknowledge. This is a transparency mechanism, not a blocker.

#### If Multiple Pending Penalties

- Show all unacknowledged penalties in the alert (stacked or paginated within the alert card).
- Each has its own Acknowledge button.
- Alert disappears only when all are acknowledged.

### 7.4 Leave Capacity Alert (HR Dashboard)

- Computed per department using `leave_capacity_config`.
- If any department is at ≥ `(dept_max_percent − 10%)` capacity today (i.e. approaching limit):
  - Show a moderate warning badge on HR dashboard listing the department name and current %.
- Informational only — does not block HR from any action.

---

## Module 8 — Company Directory

### 8.1 Access

| Action | Role |
|---|---|
| View directory | All authenticated users |
| Create / edit entries | `hr`, `super_admin` |
| Mark mobile as Public / Private | `hr`, `super_admin` |

### 8.2 Table

```sql
directory_entries (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid         REFERENCES employee_info(id),  -- NULL for generic extensions
  name                varchar(200) NOT NULL,
  email               varchar(200),
  phone_internal      varchar(50),
  phone_mobile        varchar(50),
  phone_mobile_public boolean      NOT NULL DEFAULT false,
  role_title          varchar(200),
  department_id       uuid         REFERENCES departments(id),
  branch_id           uuid         REFERENCES work_locations(id),
  availability        varchar(50),  -- 'available' | 'busy' | 'out_of_office'
  created_by          uuid         REFERENCES users(id),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
)
```

`employee_id` is nullable to support generic HO extensions or shared desk numbers that are not tied to a specific person.

### 8.3 UI Behaviour

- Default view filtered to employee's own branch.
- Toggle: view all branches or select a specific branch.
- Search: by name, department, role.
- Mobile number shown only if `phone_mobile_public = true`, except HR/Super Admin always see it.
- Auto-populated from employee profile on employee creation; HR can override.

---

## Module 9 — Extra Features

### 9.1 Birthday Calendar

- Source: `employee_info.date_of_birth` — no new table needed.
- HR dashboard: upcoming birthdays widget (next 30 days), sorted by days-until, showing employee name + date.
- Employee dashboard: same widget — all company birthdays are visible to all employees (birthdays are not private data).

### 9.2 HR / Admin Activity Logs

- Append-only `activity_logs` table. No delete.
- Examples: *"Ahmed Ali profile created by HR Zara — 10:32 AM"*, *"Leave approved for EMP045 by HR Usman."*
- Visible to HR and Super Admin only. Employees cannot see this.
- Status: **Coming Soon** — build after core modules are stable.

---

## System Complexity Assessment

| Module | Difficulty | Why |
|---|---|---|
| Employee CRUD | Low | Standard model-service-controller |
| Attendance | Medium | State machine, branch-lock, batch save, ack flow |
| Leave | Medium | Capacity logic (per-dept), balance deductions, early return, calendar |
| Notifications | Low | Simple fan-out, polling |
| Penalty Engine | Medium | Multi-step approval chain, HO/branch separation |
| Payroll (future) | High | Full calculation chain + monthly runs + reversals |
| Config UI | Low | CRUD tables + is_active toggle |
| Directory | Low | CRUD + visibility rules |
| Auth / BFF | Medium | Done — httpOnly cookies, CSRF, role guards |

**Build order (strict dependency sequence):**

```
Auth → Employee → Attendance → Leave → Notifications → Penalty → (Payroll — future)
Config UI  → parallel (no functional dependency on above)
Directory  → parallel
```

One experienced developer: ~3–4 months for this MVP.  
Highest risk: payroll calculation chain. Do not touch until F1–F3 are verified.  
Second highest risk: attendance state machine. Get DB transitions right before building UI.

---

## Open Items (Decisions Required)

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | WhatsApp delivery: v2 upgrade path | Keep manual WA link / integrate WA Business API later | Manual link for v1; WA Business API as a future phase |
| 2 | Payslip output (v2) | PDFKit, Puppeteer, WeasyPrint | PDFKit — pure Node, no headless browser |
| 3 | Attendance unlock window default | Fixed 24 h / configurable per-branch | Add `unlock_window_hours` to a global settings config table (not company_settings) |
| 4 | Directory: auto-populate from employee profile | Yes / Manual only | Yes, HR can override |
| 5 | Leave capacity fallback (no config row for dept) | Hard-block / default 50% | Default 50% with a visible warning to Super Admin to configure |
