# Bulk Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `.xlsx` employee bulk upload with validate-only preview, valid-row import, `EMP0001` IDs, and audit records for bulk actions.

**Architecture:** Backend gets dedicated employee bulk routes and service helpers so normal Add Employee remains stable. Frontend adds an Employees-page bulk modal that downloads the template, uploads one workbook for validation, renders read-only row results, and imports valid rows.

**Tech Stack:** Node/Express/PostgreSQL/Zod/Vitest, ExcelJS/Multer, React/Vite/Vitest.

---

### Task 1: Backend Dependencies And Employee ID Format

**Files:**
- Modify: `C:\backend\package.json`
- Modify: `C:\backend\src\modules\employees\employees.schema.js`
- Modify: `C:\backend\src\modules\employees\employees.schema.test.js`
- Modify: `C:\backend\seeds\master_seed_extend.js`

- [ ] Add `exceljs` and `multer`.
- [ ] Update employee ID validation to `^EMP\d{4}$`.
- [ ] Update tests and seed IDs from `EMP001` style to `EMP0001` style.
- [ ] Run `npm.cmd test -- src/modules/employees/employees.schema.test.js`.

### Task 2: Backend Audit Helper

**Files:**
- Create: `C:\backend\src\modules\audit\audit.service.js`
- Test: `C:\backend\src\modules\audit\audit.service.test.js`

- [ ] Add `recordActivityLog({ userId, action, entityType, entityId, meta, db })`.
- [ ] Insert into existing `activity_logs`.
- [ ] Swallow audit write failures only when explicitly called with `bestEffort: true`; otherwise throw.
- [ ] Test SQL shape and parameters.

### Task 3: Backend Bulk Upload API

**Files:**
- Create: `C:\backend\src\modules\employees\employees.bulk.service.js`
- Create: `C:\backend\src\modules\employees\employees.bulk.controller.js`
- Modify: `C:\backend\src\modules\employees\employees.routes.js`
- Test: `C:\backend\src\modules\employees\employees.bulk.service.test.js`
- Test: `C:\backend\src\modules\employees\employees.controller.test.js`

- [ ] Add `GET /api/employees/bulk/template`.
- [ ] Add `POST /api/employees/bulk/validate`.
- [ ] Add `POST /api/employees/bulk/import`.
- [ ] Parse `.xlsx` only.
- [ ] Resolve readable master-data names to UUIDs.
- [ ] Validate mandatory fields and produce row errors/warnings.
- [ ] Import valid rows in per-employee transactions without account/salary/allowance creation.
- [ ] Write audit logs for validate and import.

### Task 4: Frontend Bulk Upload UI

**Files:**
- Modify: `C:\frontend-2\src\pages\Employees.tsx`
- Create/modify hook: `C:\frontend-2\src\hooks\useEmployeeBulkUpload.ts`
- Test: `C:\frontend-2\src\pages\Employees.test.tsx`

- [ ] Add Bulk Upload button.
- [ ] Add modal with template download, file input, validate button, preview summary, row table, import valid rows, download error report, and completion next actions.
- [ ] Use backend endpoints.
- [ ] Keep preview view-only.

### Task 5: Verification

- [ ] Backend: `npm.cmd test`
- [ ] Backend: `npm.cmd run db:check`
- [ ] Frontend: `npm.cmd test -- --run`
- [ ] Frontend: `npm.cmd run build`
- [ ] Browser: verify `http://localhost:8080/employees` bulk modal opens and renders.
