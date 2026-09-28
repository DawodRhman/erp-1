# Department Head Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Department Head role that can read operational data and propose penalties only inside its assigned department and optional work location.

**Architecture:** A shared backend scope service resolves the caller's active assignment, falling back to the caller employee's current job department/location. Controllers pass that scope into services, and SQL applies it before returning or changing data. Frontend access remains permission-driven and hides HR-only actions.

**Tech Stack:** PostgreSQL migrations, Node/Express, Zod, Vitest, React, TypeScript.

---

### Task 1: Role, permissions, and scope storage

**Files:**
- Create: `C:\backend\migrations\1712620835000_department_head_scope.sql`
- Modify: `C:\backend\seeds\master_seed.js`
- Create: `C:\backend\src\modules\department-scope\department-scope.service.js`
- Create: `C:\backend\src\modules\department-scope\department-scope.service.test.js`

- [ ] Add the `department_head` role and scoped read/proposal permissions.
- [ ] Add immutable assignment history with one active assignment per user.
- [ ] Test assignment resolution, job-info fallback, missing scope, and target access checks.

### Task 2: Permission middleware

**Files:**
- Modify: `C:\backend\src\middleware\require-permission.js`
- Modify: `C:\backend\src\middleware\require-permission.test.js`

- [ ] Add an any-permission middleware for broad HR permissions or scoped Department Head permissions.
- [ ] Verify unauthorized roles receive `403`.

### Task 3: Scoped employee and dashboard reads

**Files:**
- Modify: `C:\backend\src\modules\employees\employees.routes.js`
- Modify: `C:\backend\src\modules\employees\employees.controller.js`
- Modify: `C:\backend\src\modules\employees\employees.service.js`
- Modify: `C:\backend\src\modules\employees\employees.service.test.js`
- Modify: `C:\backend\src\modules\dashboard\dashboard.routes.js`
- Modify: `C:\backend\src\modules\dashboard\dashboard.controller.js`
- Modify: `C:\backend\src\modules\dashboard\dashboard.service.js`
- Modify: `C:\backend\src\modules\dashboard\dashboard.service.test.js`

- [ ] Filter employee lists and employee detail by resolved scope.
- [ ] Return `403` for an out-of-scope employee.
- [ ] Scope dashboard metrics, trends, birthdays, alerts, and pending actions.
- [ ] Exclude salary, bank, medical, account, and attachment management permissions.

### Task 4: Scoped attendance and leave

**Files:**
- Modify: `C:\backend\src\modules\attendance\attendance.routes.js`
- Modify: `C:\backend\src\modules\attendance\attendance.controller.js`
- Modify: `C:\backend\src\modules\attendance\attendance.service.js`
- Modify: `C:\backend\src\modules\attendance\attendance.service.test.js`
- Modify: `C:\backend\src\modules\leave\leave.routes.js`
- Modify: `C:\backend\src\modules\leave\leave.controller.js`
- Modify: `C:\backend\src\modules\leave\leave.service.js`
- Modify: `C:\backend\src\modules\leave\leave.service.test.js`

- [ ] Scope attendance sheets and reports by department and optional location.
- [ ] Scope leave requests, balances, summaries, and calendar.
- [ ] Keep final leave approval/rejection unavailable to Department Head.

### Task 5: Scoped penalty proposals

**Files:**
- Modify: `C:\backend\src\modules\penalties\penalties.routes.js`
- Modify: `C:\backend\src\modules\penalties\penalties.controller.js`
- Modify: `C:\backend\src\modules\penalties\penalties.service.js`
- Modify: `C:\backend\src\modules\penalties\penalties.service.test.js`

- [ ] Allow Department Head to list scoped penalties and propose for scoped employees.
- [ ] Reject out-of-scope proposals with `403`.
- [ ] Keep penalty approval/rejection restricted to HR reviewers.
- [ ] Preserve audit logging for successful proposals.

### Task 6: Frontend role support

**Files:**
- Modify: `C:\frontend-2\src\context\AuthContext.tsx`
- Modify: `C:\frontend-2\src\App.tsx`
- Modify: `C:\frontend-2\src\components\layout\Sidebar.tsx`
- Modify: `C:\frontend-2\src\components\layout\Topbar.tsx`
- Modify: `C:\frontend-2\src\pages\Launchpad.tsx`
- Modify: `C:\frontend-2\src\utils\rbac.ts`
- Modify related tests.

- [ ] Recognize and display `department_head`.
- [ ] Expose Dashboard, Employees, Attendance, Leave, Calendar, Directory, Announcements, and Penalties.
- [ ] Hide employee creation/editing, accounts, salary, configuration, audit logs, and final review actions.

### Task 7: Verification

- [ ] Run focused tests after each red-green cycle.
- [ ] Run `npm.cmd run db:migrate` and `npm.cmd run db:check` in `C:\backend`.
- [ ] Run `npm.cmd test` in `C:\backend`.
- [ ] Run `npm.cmd test -- --run` and `npm.cmd run build` in `C:\frontend-2`.
- [ ] Do not commit or push.
