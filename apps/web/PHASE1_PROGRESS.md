# Phase 1 HR Core Progress

Current phase: HR core gap closure.

## Progress

- [x] Attendance correction requests
- [x] Career movements: promotion, demotion, transfer, department/designation change
- [x] Announcement read receipts
- [x] Notification fan-out for new workflows
- [ ] Frontend wiring for Phase 1 workflows
- [x] Backend verification for completed Phase 1 workflows
- [x] Frontend verification for completed Phase 1 workflows
- [ ] Browser QA prompt handoff

## Checkpoint Log

### 2026-06-16

- Started Phase 1 implementation from backend source-of-truth plan.
- Existing dirty file noticed and not touched: `C:\frontend-2\src\pages\PenaltyWorkflow.tsx`.
- Implemented backend attendance correction requests with migration, service/controller/routes, audit logging, notifications, and tests.
- Wired employee correction submission from `C:\frontend-2\src\pages\MyAttendance.tsx`.
- Wired HR correction review queue in `C:\frontend-2\src\pages\Attendance.tsx`.
- Verified targeted frontend tests for `MyAttendance` and `Attendance`.
- Implemented backend career movements with migration, schema validation, transactional job/salary movement service, controller route, and audit logging.
- Wired HR career movement creation in `C:\frontend-2\src\pages\EmployeeDetail.tsx` Management tab.
- Added frontend career movement mutation in `C:\frontend-2\src\hooks\useEmployees.ts`.
- Verified backend targeted tests: `npm.cmd test -- src/modules/attendance/attendance.service.test.js src/modules/attendance/attendance.controller.test.js src/modules/employees/employees.service.test.js src/modules/employees/employees.controller.test.js src/modules/employees/employees.schema.test.js`.
- Verified backend migration dry run: `npm.cmd run db:check`.
- Verified frontend targeted tests: `npm.cmd test -- src/pages/MyAttendance.test.tsx --run`, `npm.cmd test -- src/pages/Attendance.test.tsx --run`, and `npm.cmd test -- src/pages/EmployeeDetail.test.tsx --run`.
- Verified frontend production build: `npm.cmd run build`.
- Implemented announcement read receipts with migration, employee/user read upsert, employee-scoped list `is_read`/`read_at`, audited read endpoint, and feed “Mark as read” action.
- Verified announcement read receipts with `npm.cmd test -- src/modules/announcements/announcements.service.test.js` and `npm.cmd test -- src/pages/AnnouncementsFeed.test.tsx --run`.
- Added career movement notification fan-out to the employee account inside the career movement transaction.
- Verified notification fan-out with `npm.cmd test -- src/modules/employees/employees.service.test.js`.
- Fixed frontend test isolation and scoped attendance assertions so the Phase 1 targeted frontend suite runs reliably in one process.
- Verified combined frontend targeted suite: `npm.cmd test -- src/pages/MyAttendance.test.tsx src/pages/Attendance.test.tsx src/pages/EmployeeDetail.test.tsx src/pages/AnnouncementsFeed.test.tsx --run --pool=forks --poolOptions.forks.singleFork=true`.
