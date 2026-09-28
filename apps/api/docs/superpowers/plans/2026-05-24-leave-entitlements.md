# Leave Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically assign whole-day leave balances from company-wide or department-specific policies when employees join and when a new leave year begins.

**Architecture:** Keep entitlement logic in the Node service layer rather than database triggers. `leave_policies.department_id = null` represents a company-wide default; an active department policy overrides the default for the same leave type and year. One idempotent initializer is reused by employee creation, an authorized year-initialization API, and a schedulable CLI command.

**Tech Stack:** Node.js, Express, PostgreSQL SQL migrations, Zod, Vitest, React/Vite configuration UI.

---

### Task 1: Policy Schema And Configuration Contract

**Files:**
- Create: `migrations/1712620821000_company_wide_leave_policies.sql`
- Modify: `src/modules/config/config.controller.js`
- Modify: `src/pages/settings/settingsConfig.ts` in frontend workspace

- [ ] Add a migration making `leave_policies.department_id` nullable and replacing its unique constraint with partial unique indexes for one company-wide or one department-specific policy per leave type/year.
- [ ] Accept `department_id: null` for leave policy create/update validation.
- [ ] Let settings users choose a blank Department labelled as company-wide.

### Task 2: Entitlement Selection And Proration

**Files:**
- Create: `src/modules/leave/leave.service.test.js`
- Modify: `src/modules/leave/leave.service.js`

- [ ] Test and implement policy resolution selecting department policies over company-wide policies per leave type.
- [ ] Test and implement calendar-day proration for the employee joining year, rounded to the nearest whole day with `.5` rounded up.
- [ ] Keep inserts idempotent through existing `employee_id`, `leave_type_id`, `year` uniqueness.

### Task 3: Employee Creation And Annual Rollover

**Files:**
- Modify: `src/modules/employees/employees.service.test.js`
- Modify: `src/modules/employees/employees.service.js`
- Modify: `src/modules/leave/leave.controller.js`
- Modify: `src/modules/leave/leave.routes.js`
- Create: `scripts/initialize-yearly-leave-balances.js`
- Modify: `package.json`

- [ ] Test and call entitlement initialization inside the employee creation transaction after job information exists.
- [ ] Test and implement bulk annual initialization for all eligible employees, granting full new-year balances for existing staff and prorated balances for joiners in that year.
- [ ] Expose an authorized idempotent API and `npm run leave:rollover -- <year>` command suitable for external January 1 scheduling and safe re-runs.

### Task 4: Verification

**Files:**
- Test: backend and frontend suites

- [ ] Run `npm test` and `npm run db:check` in `C:\backend`.
- [ ] Run `npm.cmd test -- --run` and `npm.cmd run build` in `C:\frontend-2`.

