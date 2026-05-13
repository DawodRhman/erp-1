# Missing Routes Report

Generated: 2026-05-12  
Audited by: `seeds/master_seed.js` route audit (flat list from `src/modules/**/*.routes.js`)

## Summary

- **Total routes found:** HTTP handlers registered under `/api` include auth, attendance, leave-requests, calendar-events, notifications, dashboard, employees, config, penalties (mounted at `/api`), and directory.
- **Tables seeded via API:** Any row created through existing POST/PATCH could use HTTP when `SEED_USE_API=1`; the default seed uses **pool inserts** for all tables so `node seeds/master_seed.js` runs without a server.
- **Tables seeded only via SQL (no dedicated REST module):** Purchasing chain (`purchase_requests` … `invoice_items`), `inventory_items`, `inventory_movements`, `employee_job_history`, `activity_logs`, `audit_logs`, `urgent_alerts`, `pending_actions`, bulk `attendance`, `leave_balances`, `employee_salary` rows beyond nested creates, etc.

---

## Missing Routes

### 1. `employee_job_history` — POST `/api/employees/:employeeId/job-history`

**Why it's needed:** Track promotions and transfers without manual SQL.

**Suggested request body:**

```json
{
  "department_id": "uuid",
  "designation_id": "uuid",
  "manager_emp_id": "EMP012",
  "start_date": "2024-01-01",
  "end_date": null
}
```

**Suggested response:**

```json
{
  "success": true,
  "data": { "id": "uuid" }
}
```

**Priority:** MEDIUM  

**Seeded via:** Pool query in `master_seed_extend.js`

---

### 2. `employee_salary` — POST `/api/employees/:id/salary-revision` (exists) vs bulk history

**Note:** `POST /api/employees/:employeeId/salary-revision` exists (`salary:write`). There is **no** standalone bulk seed endpoint.

**Seeded via:** Pool inserts for historical rows.

**Priority:** LOW for bulk; MEDIUM if HR needs CSV import.

---

### 3. `employee_allowances` — PUT `/api/employees/:id/allowances` (exists)

**Note:** Covered by `allowances:write`. Nested allowance snapshot only through employee update flows.

**Priority:** N/A (HAS_ROUTE)

---

### 4. `leave_balances` — PATCH `/api/leave-requests/balances/adjust`

**Why:** Finance/HR sometimes adjusts entitlement outside leave workflow.

**Suggested body:**

```json
{ "employee_id": "EMP001", "leave_type_id": "uuid", "year": 2026, "balance": 10, "used": 2 }
```

**Priority:** HIGH for mid-year policy changes.

**Seeded via:** Pool

---

### 5. `leave_policies` / `leave_capacity_config` — POST `/api/config/leave-policies` and `/api/config/leave-capacity` (HAS_ROUTE via config)

**Note:** `POST /api/config/leave-policies` and `POST /api/config/leave-capacity` exist under config module.

**Seeded via:** Pool (same data as API would accept).

---

### 6. `penalty_rules` — POST `/api/penalty-rules` (HAS_ROUTE)

**Seeded via:** Pool for speed.

---

### 7. `attendance` — bulk day save — PUT `/api/attendance/save` (HAS_ROUTE)

**Seeded via:** Pool batch insert for ~40k+ rows.

---

### 8. `activity_logs` / `audit_logs` — POST (none)

**Why:** Usually written by app middleware; admin replay is rare.

**Priority:** LOW  

**Seeded via:** Pool

---

### 9. `urgent_alerts` / `pending_actions` — POST (none in `src/modules`)

**Priority:** MEDIUM for HR operations dashboard.

**Seeded via:** Pool

---

### 10. `directory_entries` — POST `/api/directory` (HAS_ROUTE)

**Note:** `createEntry` exists. Initial directory rows are also created in `createEmployee` service; full re-seed uses pool for 520 rows.

---

### 11. Purchasing & inventory — no `src` modules

**Tables:** `item_categories`, `products`, `vendors`, `customers`, `purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`, `grns`, `grn_items`, `inventory_items`, `inventory_movements`, `quotations`, `quotation_items`, `delivery_orders`, `delivery_order_items`, `invoices`, `invoice_items`

**Priority:** HIGH for a full ERP UI (separate inventory/purchasing module).

**Seeded via:** Pool only

---

## Cross-check: nested employee create

`POST /api/employees` with `createEmployeeSchema` can create `employee_info`, `job_info`, `emergency_contacts` (optional), `bank`, `medical`, `users`, `directory_entries`, `employee_salary`, `employee_allowances` in one transaction — see `employees.service.js`. It does **not** replace organization-wide seeding of purchasing, inventory, or bulk attendance.
