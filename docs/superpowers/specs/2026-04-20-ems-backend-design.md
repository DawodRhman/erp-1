# EMS Backend — Full Design Spec
**Date:** 2026-04-20
**Scope:** HCM module — Employee, Attendance, Leave, Permission System
**Out of scope:** Inventory, Finance, Official Announcements

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Validation library | Zod | Standardized across all routes |
| Permission strategy | DB lookup + per-request cache | Always fresh, one DB hit max per request |
| Role model | Department-scoped roles + global super_admin | Scalable — new roles added via dashboard, no code changes |
| Permission key format | `resource:action` | Programmatically queryable, maps to route structure |
| No deletes | Hard rule everywhere | Append/update only across all tables |

---

## Architecture

Existing layered structure unchanged:
```
routes → middleware → controllers → services → models
```

New additions:
```
src/
  schemas/                        ← Zod schemas per resource
  middleware/
    auth-middleware.js            ← modified: new JWT shape
    permission-middleware.js      ← NEW: requirePermission factory
    validate-middleware.js        ← NEW: Zod validate factory
```

---

## Permission System

### Role Model
- `super_admin` — global role, `department_id = NULL` on `roles` table, bypasses all permission checks
- All other roles — department-scoped, granted specific `permission_key`s via `role_permissions`

### JWT Payload (updated)
```js
{ user_id, employee_id, role_id, is_super_admin }
```
`is_super_admin` computed at login: `roles.department_id IS NULL AND roles.role_name = 'super_admin'`

### `requirePermission(key)` Middleware Factory
```
verifyToken → requirePermission('resource:action')
                  ↓
         is_super_admin? → next()
                  ↓ no
         req.permissions cached? → use it
                  ↓ no
         SELECT permission_key FROM permissions
           JOIN role_permissions USING (id)
           WHERE role_id = req.user.role_id
         → cache as Set on req.permissions
                  ↓
         set.has(key) ? next() : 403
```

### Permission Keys (v1)
| Resource | Keys |
|---|---|
| Employees | `employees:read`, `employees:write` |
| Attendance | `attendance:read`, `attendance:write` |
| Leave | `leave:read`, `leave:write`, `leave:approve` |
| Config tables | `config:manage` |

### `validate(schema)` Middleware Factory
```js
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(422).json({
            error: 'Validation failed',
            issues: result.error.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message
            }))
        });
    }
    req.body = result.data;
    next();
};
```

### HTTP Status Code Map
| Code | When |
|---|---|
| 200 | Successful GET / PUT / PATCH |
| 201 | Successful POST |
| 400 | Malformed request / bad format |
| 401 | No token / invalid / expired |
| 403 | Authenticated but missing permission |
| 404 | Resource not found |
| 409 | Conflict — duplicate CNIC, overlapping leave, etc. |
| 422 | Zod validation failure |
| 500 | Unexpected server error |

---

## Phase 1 — Fixes + Zod + Permission Wiring

### 1.1 Remove All Deletes
Every `DELETE` route, controller export, service method, and model method removed across:
- `employee-info`, `extra-employee-info`, `job-info`, `department`, `designation`
- `employment-type`, `job-status`, `work-mode`, `work-location`
- `shift`, `leave-type`, `leave-policy`, `leave-balance`, `user`

### 1.2 Auth Service JWT Fix
Login query joins `users → roles`. Sets `is_super_admin: true` if `roles.department_id IS NULL AND roles.role_name = 'super_admin'`. New JWT shape: `{ user_id, employee_id, role_id, is_super_admin }`.

### 1.3 Zod Schemas
One file per resource in `src/schemas/`. Schemas cover create and update payloads for all existing routes.

### 1.4 Config Routes Protected
All POST/PUT/PATCH on config tables get `requirePermission('config:manage')`. GET endpoints remain open (any authenticated user reads dropdowns).

Config tables: departments, designations, job-statuses, work-modes, work-locations, employment-types, shifts, leave-types, leave-policies.

### 1.5 Employee Search
```
GET /api/employees?search=ahmed
GET /api/employees?search=EMP001
```
```sql
WHERE name ILIKE '%' || $1 || '%' OR employee_id ILIKE '%' || $1 || '%'
```
Also fixes the existing route conflict: `GET /employees` and `GET /employees/:id` get separate handlers.

---

## Phase 2 — Attendance Module

### New Files
```
src/schemas/attendance.schema.js
src/models/attendance-model.js
src/services/attendance-service.js
src/controllers/attendance-controller.js
src/routes/attendance-routes.js
```

### Endpoints
| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/api/attendance/daily` | `attendance:read` | Daily sheet with filters |
| POST | `/api/attendance/batch` | `attendance:write` | Save full day's grid |
| GET | `/api/attendance/report` | `attendance:read` | Monthly roll-up |

### Daily Sheet GET
```
GET /api/attendance/daily?date=2026-04-20&department=&location=&shift=&employee=
```

Returns all employees for the date joined with shift + attendance. Employees with no attendance row get a default empty row (`status: absent`, `check_in: null`).

Join:
```sql
employee_info
  JOIN job_info USING (employee_id)
  JOIN shifts ON job_info.shift_id = shifts.id
  LEFT JOIN attendance ON (
    attendance.employee_id = employee_info.employee_id
    AND attendance.date = $date
  )
  JOIN departments ON job_info.department_id = departments.id
  JOIN work_locations ON job_info.work_location_id = work_locations.id
```

Late calculation (in SQL):
```sql
CASE
  WHEN attendance.check_in IS NOT NULL
  THEN EXTRACT(EPOCH FROM (attendance.check_in - shifts.start_time)) / 60
  ELSE NULL
END AS late_by_minutes
```

On-leave auto-fill: if an approved `leave_request` covers the employee on that date, `notes` = leave reason, `notes_readonly = true`.

### Batch Save POST
```
POST /api/attendance/batch
Body: { date, rows: [{ employee_id, shift_id, check_in, check_out, status, notes, ack }] }
```

- Zod validates all rows first — any failure → 422 with per-row errors, nothing written
- All rows saved in a single transaction via upsert:
```sql
INSERT INTO attendance (employee_id, shift_id, date, check_in, check_out, status, notes, marked_by)
VALUES (...)
ON CONFLICT (employee_id, date)
DO UPDATE SET
  check_in = EXCLUDED.check_in,
  check_out = EXCLUDED.check_out,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  marked_by = EXCLUDED.marked_by,
  updated_at = CURRENT_TIMESTAMP
```

### Monthly Report GET
```
GET /api/attendance/report?month=4&year=2026&department=uuid
```

```sql
SELECT
  ei.employee_id, ei.name,
  COUNT(*) FILTER (WHERE a.status = 'present')  AS presents,
  COUNT(*) FILTER (WHERE a.status = 'absent')   AS absents,
  COUNT(*) FILTER (WHERE a.status = 'late')     AS lates,
  COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
  COUNT(*) FILTER (WHERE a.status = 'on_leave') AS on_leaves,
  COUNT(*) AS total_working_days,
  ROUND(
    COUNT(*) FILTER (WHERE a.status IN ('present','late','half_day'))
    * 100.0 / NULLIF(COUNT(*), 0), 2
  ) AS attendance_pct
FROM employee_info ei
JOIN job_info ji USING (employee_id)
JOIN attendance a USING (employee_id)
WHERE EXTRACT(MONTH FROM a.date) = $month
  AND EXTRACT(YEAR  FROM a.date) = $year
GROUP BY ei.employee_id, ei.name
```

---

## Phase 3 — Leave Requests Module

### New Files
```
src/schemas/leave-request.schema.js
src/models/leave-request-model.js
src/services/leave-request-service.js
src/controllers/leave-request-controller.js
src/routes/leave-request-routes.js
```

### Endpoints
| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/api/leave-requests` | `leave:read` | List with filters |
| POST | `/api/leave-requests` | `leave:write` | Create request |
| PATCH | `/api/leave-requests/:id/approve` | `leave:approve` | Approve |
| PATCH | `/api/leave-requests/:id/reject` | `leave:approve` | Reject |
| PATCH | `/api/leave-requests/:id/early-return` | `leave:approve` | Early return + balance restore |
| GET | `/api/leave-requests/balances` | `leave:read` | All employee balances |
| GET | `/api/leave-requests/calendar` | `leave:read` | Approved leaves for calendar |

### Create POST
```
POST /api/leave-requests
Body: { employee_id, leave_type_id, start_date, end_date, reason }
```

Validation chain — each failure has its own status:
| Check | Status |
|---|---|
| Missing/invalid fields (Zod) | 422 |
| Employee not found | 404 |
| Leave type not found | 404 |
| Insufficient balance | 409 |
| Overlapping pending/approved leave | 409 |

Days = `end_date - start_date + 1` (inclusive).

Overlap check:
```sql
SELECT id FROM leave_requests
WHERE employee_id = $1
  AND status IN ('pending', 'approved')
  AND NOT (end_date < $start_date OR start_date > $end_date)
```

### Approve / Reject PATCH
Both run in a transaction. Guard: request must be `pending` → else 409.

**Approve:**
1. `status = 'approved'`, `reviewed_by`, `reviewed_at = now`
2. `UPDATE leave_balances SET used = used + days, balance = balance - days`

**Reject:**
1. `status = 'rejected'`, `reviewed_by`, `reviewed_at = now`
2. No balance change

### Early Return PATCH
```
PATCH /api/leave-requests/:id/early-return
Body: { end_by_force }
```

Guard: request must be `approved`. DB constraint `chk_end_by_force` enforces `start_date ≤ end_by_force ≤ end_date`.

Transaction:
```
original_days   = end_date - start_date + 1
actual_days     = end_by_force - start_date + 1   (minimum 1)
days_to_restore = original_days - actual_days

UPDATE leave_balances
  SET used = used - days_to_restore,
      balance = balance + days_to_restore
  WHERE employee_id = $1 AND leave_type_id = $2
    AND year = EXTRACT(YEAR FROM start_date)

UPDATE leave_requests
  SET end_by_force = $end_by_force, updated_at = now
  WHERE id = $id
```

### Balances GET
```
GET /api/leave-requests/balances?department=&location=&shift=
```

Returns one row per employee with all their leave type balances:
```json
{
  "employee_id": "EMP001",
  "name": "Ahmed Ali",
  "department": "Engineering",
  "balances": [
    { "leave_type": "Annual", "balance": 5, "total": 12 },
    { "leave_type": "Casual", "balance": 1, "total": 12 }
  ]
}
```

### Calendar GET
```
GET /api/leave-requests/calendar?department=&month=&year=
```

Returns only `approved` leaves: `employee_id`, `name`, `start_date`, `end_date`, `leave_type`. Frontend renders date ranges.

---

## Implementation Order

1. **Phase 1** — Remove deletes → Fix auth/JWT → Build permission + validate middleware → Add Zod schemas → Wire config route guards → Fix employee search
2. **Phase 2** — Attendance model → service → controller → routes → register in server.js
3. **Phase 3** — Leave request model → service → controller → routes → register in server.js
