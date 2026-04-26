# EMS ERP — System Architecture Document
**Date:** 2026-04-26  
**Backend:** `D:\Desktop\EMS\backend` — Node.js ES Modules, Express, node-postgres, node-pg-migrate  
**Frontend:** `D:\Desktop\EMS\client\final_product` — Next.js App Router (BFF pattern)  
**DB:** PostgreSQL (public schema)  
**Auth:** httpOnly JWT cookie (`ems_jwt`), CSRF token (`ems_csrf`)  
**Requirement source:** EMS-ERP-Requirements-V3.md — that document is authoritative.

---

## 1. Current Schema Inventory (What Actually Exists in DB)

### 1.1 HCM Tables (Exist)

| Table | Key Columns | Notes |
|---|---|---|
| `employee_info` | `id uuid`, `employee_id varchar(10)` PK-like, `name`, `father_name`, `cnic`, `date_of_birth varchar(15)` | `employee_id` is the FK used across all HCM tables — not UUID |
| `extra_employee_info` | `employee_id` FK, contacts, bank, addresses | One-to-one with `employee_info` |
| `job_info` | `employee_id`, `department_id`, `designation_id`, `employment_type_id`, `job_status_id`, `work_mode_id`, `work_location_id`, `shift_id`, `date_of_joining`, `date_of_exit`, `probation_end_date`, `contract_end_date` | One row per employee (UNIQUE on `employee_id`) |
| `employee_job_history` | `employee_id`, `department_id`, `designation_id`, `manager_emp_id`, `start_date`, `end_date` | Append-only history log |
| `users` | `id uuid`, `employee_id`, `email`, `password`, `role_id` | Missing: `must_change_password`, `password_changed_at` |
| `roles` | `id`, `department_id`, `role_name`, `description` | Roles are DEPARTMENT-scoped. No flat `super_admin/hr/employee` enum — RBAC is via `role_permissions` |
| `permissions` | `id`, `permission_key`, `description` | Granular permission strings |
| `role_permissions` | `role_id`, `permission_id` | Many-to-many join |
| `attendance` | `employee_id`, `shift_id`, `date`, `check_in`, `check_out`, `status`, `notes`, `marked_by`, `ack` | Missing: branch-lock state machine columns |
| `shifts` | `id`, `name`, `start_time`, `end_time`, `late_after_minutes`, `is_active` | |
| `leave_requests` | `employee_id`, `leave_type_id`, `start_date`, `end_date`, `end_by_force`, `status`, `reviewed_by` | |
| `leave_balances` | `employee_id`, `leave_type_id`, `year`, `balance`, `used` | UNIQUE on `(employee_id, leave_type_id, year)` |
| `leave_policies` | `department_id`, `leave_type_id`, `days_allowed`, `year`, `is_active` | |
| `leave_types` | `name`, `is_active` | |

### 1.2 Config Tables (Exist, Have `is_active`)

| Table | `is_active` |
|---|---|
| `departments` | ❌ MISSING — needs migration |
| `designations` | ✅ |
| `employment_types` | ✅ |
| `job_statuses` | ✅ |
| `work_modes` | ✅ |
| `work_locations` | ✅ |
| `shifts` | ✅ |
| `leave_types` | ✅ |
| `leave_policies` | ✅ |

### 1.3 Support Tables Added by Migration 008 (Exist)

| Table | Purpose |
|---|---|
| `calendar_events` | Company events/holidays |
| `notifications` | Fan-out notifications by `user_id` or `role` |
| `pending_actions` | Employees with missing profile fields |
| `urgent_alerts` | Probation/contract expiry alerts |

### 1.4 Non-HCM Tables (Exist — Do Not Touch)

`customers`, `vendors`, `products`, `item_categories`, `inventory_items`, `inventory_movements`, `purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`, `grns`, `grn_items`, `quotations`, `quotation_items`, `delivery_orders`, `delivery_order_items`, `invoices`, `invoice_items`, `audit_logs`

Sequences: `customer_seq`, `do_seq`, `grn_seq`, `invoice_seq`, `pay_seq`, `po_seq`, `pr_seq`, `quotation_seq`, `vendor_seq`

---

## 2. Gap Migrations Required (V3 vs Current Schema)

These migrations do not exist yet and must be written before the affected modules are built.

### Migration 009 — Users Auth Fields
```sql
-- Up
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Down
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS must_change_password;
```

### Migration 010 — Departments `is_active`
```sql
-- Up
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down
DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
ALTER TABLE public.departments
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS is_active;
```

### Migration 011 — Attendance Branch-Lock State Machine
```sql
-- Up
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS state varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft','saved','submitted','locked','ho_unlocked')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS unlock_reason text,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

-- Down
ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS unlocked_at,
  DROP COLUMN IF EXISTS unlock_reason,
  DROP COLUMN IF EXISTS unlocked_by,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS state;
```

### Migration 012 — Penalty Engine
```sql
-- Up
CREATE TABLE public.penalty_rules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(100) NOT NULL,
  amount_pkr   numeric(10,2) NOT NULL,
  type         varchar(20)  NOT NULL CHECK (type IN ('flat','percentage')),
  is_active    boolean      NOT NULL DEFAULT true,
  created_by   uuid         REFERENCES public.users(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_penalties (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         varchar(10) NOT NULL REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
  rule_id             uuid        NOT NULL REFERENCES public.penalty_rules(id),
  date                date        NOT NULL,
  reason              text,
  status              varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  proposed_by         uuid        REFERENCES public.users(id),
  submitted_to_ho_at  timestamptz,
  reviewed_by         uuid        REFERENCES public.users(id),
  reviewed_at         timestamptz,
  review_note         text,
  employee_ack        boolean     NOT NULL DEFAULT false,
  employee_acked_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_penalty_rules_updated_at
  BEFORE UPDATE ON public.penalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employee_penalties_updated_at
  BEFORE UPDATE ON public.employee_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_penalties_employee ON public.employee_penalties(employee_id);
CREATE INDEX idx_penalties_status ON public.employee_penalties(status);

-- Down
DROP TRIGGER IF EXISTS trg_employee_penalties_updated_at ON public.employee_penalties;
DROP TRIGGER IF EXISTS trg_penalty_rules_updated_at ON public.penalty_rules;
DROP TABLE IF EXISTS public.employee_penalties;
DROP TABLE IF EXISTS public.penalty_rules;
```

### Migration 013 — Leave Capacity Config (Per Department)
```sql
-- Up
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

-- Down
DROP TRIGGER IF EXISTS trg_leave_capacity_config_updated_at ON public.leave_capacity_config;
DROP TABLE IF EXISTS public.leave_capacity_config;
```

### Migration 014 — Company Directory
```sql
-- Up
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

-- Down
DROP TRIGGER IF EXISTS trg_directory_entries_updated_at ON public.directory_entries;
DROP TABLE IF EXISTS public.directory_entries;
```

### Migration 015 — Activity Logs (Coming Soon table, schema only)
```sql
-- Up
CREATE TABLE public.activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.users(id),
  action      text        NOT NULL,
  entity_type varchar(100),
  entity_id   varchar(100),
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
  -- No updated_at — append-only, never updated
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Down
DROP TABLE IF EXISTS public.activity_logs;
```

### Permissions Seed (New Keys to Insert)
```sql
INSERT INTO public.permissions (permission_key, description) VALUES
  ('calendar:read',          'View calendar events'),
  ('calendar:write',         'Create/edit calendar events'),
  ('notifications:read',     'Read own notifications'),
  ('notifications:write',    'Create notifications (HR/Super)'),
  ('alerts:read',            'View urgent alerts'),
  ('pending_actions:read',   'View pending actions'),
  ('penalty_rules:write',    'Create/edit penalty rules (Super Admin only)'),
  ('penalties:propose',      'Propose a penalty (Branch HR)'),
  ('penalties:review',       'Approve/reject penalties (HO HR/Super)'),
  ('penalties:read_own',     'View own penalties (Employee)'),
  ('penalties:read_all',     'View all penalties (HR/Super)'),
  ('leave_capacity:write',   'Configure leave capacity per department'),
  ('directory:read',         'View company directory'),
  ('directory:write',        'Edit company directory entries'),
  ('config:write',           'Create/edit config tables (Super Admin only)'),
  ('attendance:submit_ho',   'Submit attendance to HO'),
  ('attendance:unlock',      'Unlock submitted attendance (HO only)')
ON CONFLICT (permission_key) DO NOTHING;
```

---

## 3. Backend Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                  # pg Pool instance
│   ├── middleware/
│   │   ├── auth.js                # verifyToken — reads ems_jwt cookie
│   │   ├── requirePermission.js   # (permission_key) => middleware
│   │   └── validate.js            # (zodSchema) => middleware
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── employees/
│   │   │   ├── employees.routes.js
│   │   │   ├── employees.controller.js
│   │   │   ├── employees.service.js
│   │   │   └── employees.schema.js    # Zod schemas
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── notifications/
│   │   ├── calendar-events/
│   │   ├── penalties/
│   │   ├── dashboard/
│   │   ├── config/                    # all config table CRUD
│   │   └── directory/
│   ├── utils/
│   │   ├── errors.js              # AppError class, errorHandler middleware
│   │   ├── paginate.js
│   │   └── respond.js             # res.success / res.fail helpers
│   └── app.js                     # Express app, route mounts
├── migrations/
│   ├── 1712620801000_create_sequences.sql
│   ├── 1712620803000_create_tables.sql
│   ├── 1712620804000_create_constraints.sql
│   ├── 1712620805000_create_indexes.sql
│   ├── 1712620807000_add_attendance_ack.sql
│   ├── 1712620808000_add_hcm_support_tables.sql
│   ├── 1712620809000_users_auth_fields.sql         ← write next
│   ├── 1712620810000_departments_is_active.sql
│   ├── 1712620811000_attendance_branch_lock.sql
│   ├── 1712620812000_penalty_engine.sql
│   ├── 1712620813000_leave_capacity_config.sql
│   ├── 1712620814000_directory_entries.sql
│   └── 1712620815000_activity_logs.sql
└── scripts/
    └── api-security-check.mjs
```

---

## 4. Frontend Folder Structure

```
client/final_product/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── change-password/page.tsx
│   ├── (hr)/
│   │   ├── dashboard/page.tsx          # Server Component
│   │   ├── employees/page.tsx          # Server Component — search + detail
│   │   ├── attendance/page.tsx
│   │   ├── leave/page.tsx
│   │   ├── penalties/page.tsx          # Coming Soon until F1
│   │   └── config/                     # super_admin only
│   │       ├── page.tsx
│   │       └── [...slug]/page.tsx
│   ├── me/                             # Employee self-service
│   │   ├── dashboard/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── leave/page.tsx
│   │   └── penalties/page.tsx
│   ├── directory/page.tsx              # All authenticated users
│   └── api/                           # Next.js Route Handlers (BFF)
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── session/route.ts
│       └── proxy/
│           └── [...path]/route.ts     # Forward to backend
├── components/
│   ├── ui/                            # Card, Button, Pill, Badge, Table, etc.
│   ├── layout/                        # Sidebar, Header, NotificationBell
│   └── modules/                       # Module-specific components
├── lib/
│   ├── auth.ts                        # Server-only: readCookie + verifyJWT
│   ├── api.ts                         # Client-side fetch wrapper (no token in localStorage)
│   └── query-client.ts                # React Query client
└── middleware.ts                      # Route guards (unauthenticated → /login, etc.)
```

---

## 5. Auth Flow

```
Browser                  Next BFF (/api/*)          Backend (/api/*)
  |                            |                          |
  |-- POST /api/auth/login --> |                          |
  |   { email, password }      |-- POST /api/auth/login ->|
  |                            |   { email, password }    |
  |                            |<-- { token, user } ------|
  |                            |                          |
  |                            | Set-Cookie: ems_jwt=...  |
  |                            | (httpOnly, SameSite=Lax) |
  |<-- { user } (no token) ----|                          |
  |                            |                          |
  |-- GET /any-page ---------->|                          |
  |   Cookie: ems_jwt=...      | middleware.ts checks     |
  |                            | must_change_password     |
  |                            | → redirect /change-pw    |
  |                            |                          |
  |-- GET /api/proxy/employees>|                          |
  |   Cookie: ems_jwt=...      |-- GET /api/employees --->|
  |                            | Authorization: Bearer <token from cookie>
  |                            |<-- JSON response --------|
  |<-- JSON response ----------|                          |
```

**CSRF:** All non-GET `/api/*` mutations require `x-csrf-token` header matching `ems_csrf` cookie value.

**`must_change_password` check:** After JWT decode, if `must_change_password = true`, Next.js middleware redirects to `/change-password` for every route except `POST /api/auth/change-password`.

---

## 6. API Contract Standard

Every backend route returns this envelope:

```json
// Success
{ "success": true, "data": <payload> }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

HTTP status codes — strictly:

| Code | When |
|---|---|
| `200` | GET, PATCH success |
| `201` | POST (create) success |
| `400` | Malformed request / bad JSON |
| `401` | No/invalid JWT |
| `403` | JWT valid but missing permission |
| `404` | Record not found |
| `409` | Conflict (duplicate, capacity exceeded, state machine violation) |
| `422` | Zod validation failure |
| `500` | Unhandled server error (never expose stack trace in prod) |

Pagination (list endpoints):
```json
{
  "success": true,
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20, "pages": 5 }
}
```

---

## 7. RBAC Architecture Note

The DB uses a **role-per-department** model (`roles` is tied to `department_id`). This is more granular than a flat `super_admin/hr/employee` enum. In practice:

- **Super Admin** = a role with all permissions seeded via `role_permissions`
- **HR** = roles with HCM permission keys
- **Employee** = roles with self-service permission keys only

The `requirePermission('permission_key')` middleware on each route is the enforcement point. The permission_key strings in §2 (Permissions Seed) are the authoritative list.

---

## 8. Key Schema Facts (Critical for IDE AI Context)

| Fact | Detail |
|---|---|
| Employee FK pattern | All HCM tables use `employee_id varchar(10)` as FK — NOT the UUID `id`. e.g. `attendance.employee_id → employee_info.employee_id` |
| One job_info per employee | `job_info` has `UNIQUE (employee_id)` — one active record per employee |
| Attendance uniqueness | `UNIQUE (employee_id, date)` — one row per employee per day |
| Leave balance uniqueness | `UNIQUE (employee_id, leave_type_id, year)` |
| Leave policy uniqueness | `UNIQUE (leave_type_id, department_id, year)` |
| `date_of_birth` is `varchar(15)` | Stored as string (`YYYY-MM-DD`). Birthday queries must parse string, not cast to date type. |
| No updated_at trigger on `attendance` yet | The trigger was not in the migrations. Must add in migration 011 or separately. |
| `departments` has no `is_active` yet | Migration 010 adds it. |
| `roles` is department-scoped | `roles.department_id` is NOT NULL. A role belongs to a department. |

---

## 9. Module Build Order & Migration Dependencies

```
Migrations 001–008   DONE (in DB)
Migration  009       → enables first-login security
Migration  010       → enables departments is_active for config UI
Migration  011       → enables attendance branch-lock
Migration  012       → enables penalty engine
Migration  013       → enables per-dept leave capacity
Migration  014       → enables directory
Migration  015       → enables activity logs (Coming Soon)

Build order:
  Auth (done)
    ↓
  Employee CRUD (done partially)
    ↓
  Config UI (Migrations 009+010 prereq)
    ↓
  Attendance Branch-Lock (Migration 011 prereq)
    ↓
  Leave + Capacity (Migration 013 prereq)
    ↓
  Notifications (Migration 008 done)
    ↓
  Penalty Engine F1 (Migration 012 prereq)
    ↓
  Directory (Migration 014 prereq)
    ↓
  Payroll F2–F6 (future — no migrations yet)
```

---

## 10. Prompt Template for IDE AI (Use This Per Task)

```
## Context
Backend: Node.js ES Modules, Express, node-postgres (pg), node-pg-migrate
Frontend: Next.js App Router, React Query, TypeScript
DB schema: [paste relevant CREATE TABLE blocks from this doc]
Requirements: [paste relevant module section from EMS-ERP-Requirements-V3.md]

## Hard constraints
- File naming: kebab-case
- ES Modules only (import/export, no require/module.exports)
- All inputs validated with Zod before any DB call
- No delete routes or methods anywhere
- HTTP codes: 400 malformed, 401 unauth, 403 forbidden, 409 conflict, 422 validation, 404 not found
- Response envelope: { success: true, data: ... } / { success: false, error: { code, message } }
- All employee FKs use employee_id varchar(10), not UUID id
- employee_id FK in all HCM tables references employee_info.employee_id

## Task
Build: [exact thing — e.g. "GET /api/leave-requests route with capacity check"]
Files to create/modify: [list them]
Do NOT build anything outside this task.
```
