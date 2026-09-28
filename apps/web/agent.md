# EMS Agent Reference

This file is the standing handoff document for future EMS work. Read it before making backend or frontend changes.

## Role Hierarchy

1. Super Admin
   - Platform owner and emergency override role.
   - Can access dashboards, employees, attendance, leave, penalties, accounts, audit log, and system configuration.
2. Head Office HR / Head HR
   - Enterprise HR owner.
   - Should have the same HR-operational permissions as Super Admin, including configuration pages.
   - Should not be treated as a technical platform owner if a future system-owner permission exists.
3. HR Manager
   - Can manage HR operations, review workflows, configure HR entities where permissions allow, and access employee self-service for own data.
4. Department Head
   - Planned role only. Not implemented yet.
   - Should view employees, attendance, leave, and penalties for own department/location scope.
   - Should be able to propose penalties, subject to Head Office HR review.
   - Should not terminate/fire employees.
5. HR Executive / HR Officer
   - Operational HR user.
   - Can work on assigned HR workflows according to backend permissions.
   - Must also have employee self-service scoped to own data.
6. Employee
   - Self-service only.
   - Can view own profile, attendance, leave, penalties, and directory where allowed.

## Permission Principles

- Never show UI actions that the current user cannot perform.
- Never expose raw UUIDs when readable names or employee IDs are available.
- Employee self-service must always be scoped to the logged-in employee.
- HR-facing pages should use real backend data only. Do not add fake/demo data to employee-facing pages.
- Backend permission checks remain authoritative. Frontend permission checks are UX and safety, not security.

## Backend Change SOP

1. Inspect existing route, controller, service, schema, migration, seed, and tests before editing.
2. Follow existing module patterns.
3. Add migrations in `C:\backend\migrations` with:
   - `-- Up Migration`
   - SQL changes
   - `-- Down Migration`
   - rollback SQL
4. Add/update schema validation when request/response shapes change.
5. Add/update service tests for behavior changes.
6. Update seeds when new permissions, roles, or master data are needed.
7. Verify backend with:
   - `npm.cmd test`
   - `npm.cmd run db:check`

## Frontend Change SOP

1. Inspect nearby pages/components/hooks before changing UI.
2. Follow the current app theme, spacing, typography, icons, and layout patterns.
3. Add inline validation for forms. Use HR-friendly wording.
4. Use `mandatory`, not `required`, for user-facing validation language.
5. Focus the first invalid field on submit.
6. Normalize backend response shapes defensively.
7. Add/update tests when behavior changes.
8. Verify frontend with:
   - `npm.cmd test -- --run`
   - `npm.cmd run build`

## Planned Features Not Yet Implemented

### Department Head Role

Already implemented as a scoped role. Keep extending only when a route or UI still leaks broader HR access.

### Bulk Employee Upload

Already implemented. Keep improving validation, preview editing, and post-import follow-up actions instead of rebuilding the flow.

## Standing Product Rules

- Do not add unsupported configuration pages.
- Announcements are a communication module, not a configuration page.
- Calendar event management may live in a management route, but employee calendar views should remain read-only.
- Payroll is Coming Soon until backend payroll is complete.
- Profile changes by employees should be handled in a future "Request Profile Change" workflow, not direct self-editing.

## Recent Work Summary

- Fixed `/leave` Approved By display for HR and Super Admin with readable reviewer fallback values.
- Added multi-department and multi-designation chips for Announcements and Calendar Events.
- Calendar Events now support from/to date ranges in backend, frontend forms, and calendar rendering.
- Announcement and Calendar Event popup modals were widened and reorganized for easier HR editing.
- Add Employee address fields now use Pakistan-only searchable location dropdowns with live add for province, district, city, and town/area.
