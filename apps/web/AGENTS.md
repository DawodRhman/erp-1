# EMS Agent Handoff

Read this file before making frontend or backend changes. It is the current working guide for AI agents on the EMS ERP HR module.

## Workspaces

- Frontend: `C:\frontend-2`
- Backend: `C:\backend`
- Frontend app: React/Vite EMS UI
- Backend app: Node/Express/PostgreSQL EMS API
- Backend migrations: `C:\backend\migrations`

## How To Start Work

1. Read this file and `C:\frontend-2\agent.md`.
2. Inspect the relevant frontend and backend files before changing anything.
3. Understand the request fully before implementation:
   - What is being changed?
   - Why is it needed?
   - Where does it belong?
   - How does data move between frontend, backend, and database?
   - When does the user see the behavior?
4. Create a short plan before editing code.
5. Use test-first debugging for bugs and behavior changes where practical.
6. Keep changes scoped to the requested task.
7. Do not revert unrelated dirty worktree changes.
8. Document what was changed in the final response.

## Product Rules

- Use real backend data. Do not add fake/demo data to HR or employee-facing pages.
- Never expose raw UUIDs when readable names or employee IDs are available.
- Employee self-service must always be scoped to the logged-in employee.
- Backend permission checks are authoritative. Frontend permission checks are UX and safety only.
- Do not show UI actions that the current user cannot perform.
- Audit Logs are mandatory for every database-changing action supported by the backend/frontend.
- Audit Logs are read-only and Super Admin only. No role, including Super Admin, should get delete/edit controls for audit log entries.
- Every new module or feature that creates, updates, imports, approves, rejects, uploads, generates, or otherwise changes persistent data must write an audit log entry.
- Use `mandatory`, not `required`, in user-facing validation language.
- Payroll stays Coming Soon until backend payroll is complete.
- Calendar employee views are read-only. Calendar event management belongs in management/configuration screens.
- Announcements are a communication module, not a generic configuration page.
- Employee profile edits by employees should become a future request workflow, not direct self-editing.

## Role Rules

1. Super Admin
   - Platform owner and emergency override role.
   - Full access to dashboards, employees, attendance, leave, penalties, accounts, audit log, and system configuration.
2. Head Office HR / Head HR
   - Enterprise HR owner.
   - Same HR-operational permissions as Super Admin, including configuration pages.
   - Should not be treated as a technical platform owner if a future system-owner permission exists.
3. HR Manager
   - Manages HR operations and review workflows where permissions allow.
   - Also gets employee self-service for own employee data.
4. Department Head
   - Planned role only.
   - Should be scoped to own department/location.
   - Should not terminate/fire employees.
5. HR Executive / HR Officer
   - Operational HR user.
   - Must also have employee self-service scoped to own data.
6. Employee
   - Self-service only.
   - Can view own profile, attendance, leave, penalties, directory, announcements, and calendar where allowed.

## Backend Change SOP

1. Inspect existing route, controller, service, schema, migration, seed, and tests before editing.
2. Follow existing module patterns.
3. For every database-changing endpoint, add or update Audit Log writes before considering the backend work complete.
4. Add migrations in `C:\backend\migrations` with:
   - `-- Up Migration`
   - SQL changes
   - `-- Down Migration`
   - rollback SQL
5. Add/update schema validation when request or response shapes change.
6. Add/update service/controller tests for behavior changes, including audit-log behavior for writes.
7. Update seeds when new permissions, roles, or master data are needed.
8. Verify backend with:
   - `npm.cmd test`
   - `npm.cmd run db:check`

## Frontend Change SOP

1. Inspect nearby pages, components, hooks, and tests before editing.
2. Follow the current app theme, spacing, typography, icons, and layout patterns.
3. Use real backend hooks/API clients; normalize backend response shapes defensively.
4. Add inline validation for forms with HR-friendly wording.
5. Focus the first invalid field on submit when adding form validation.
6. For write actions, make sure the UI calls backend endpoints that create Audit Log entries. Do not bypass audited backend APIs with local-only state changes.
7. Audit Log UI must be Super Admin only, read-only, searchable, and filterable by module/action/date/actor/target where data is available.
8. Add/update tests when behavior changes.
9. Verify frontend with:
   - `npm.cmd test -- --run`
   - `npm.cmd run build`

## Recent Work Summary

This section is only for work from the last few days. Do not rewrite the whole project history here.

### Leave Approved By

- Fixed `/leave` so HR and Super Admin can see a readable Approved By value.
- Backend leave list now falls back from reviewer employee name to reviewer account email.
- Frontend filters out raw reviewer UUIDs and shows `Not provided` instead.
- Added backend and frontend regression tests.

Files involved:
- `C:\backend\src\modules\leave\leave.service.js`
- `C:\backend\src\modules\leave\leave.service.test.js`
- `C:\frontend-2\src\pages\Leave.tsx`
- `C:\frontend-2\src\pages\Leave.test.tsx`

### Announcement And Calendar Target Chips

- Added real multi-target department/designation selection for Announcements and Calendar Events.
- HR can select multiple departments.
- Designation chips show only designations under the selected departments.
- No selected department chips means all departments.
- No selected designation chips means everyone in the selected departments.
- Employee-visible announcements/calendar events are filtered by the employee's department and designation on the backend.
- Existing single-target announcement data is backfilled into the new array fields.
- Calendar Events now support a from date and to date instead of only one date.
- Calendar event range filtering returns events whose date ranges overlap the requested calendar range.
- Calendar view shows multi-day events on every covered day.
- Announcement and Calendar Event popup modals were widened and reorganized for easier HR data entry.

Files involved:
- `C:\backend\migrations\1712620826000_multi_target_calendar_announcements.sql`
- `C:\backend\migrations\1712620827000_calendar_event_date_ranges.sql`
- `C:\backend\src\modules\announcements\announcements.controller.js`
- `C:\backend\src\modules\announcements\announcements.service.js`
- `C:\backend\src\modules\announcements\announcements.service.test.js`
- `C:\backend\src\modules\calendar-events\calendar-events.controller.js`
- `C:\backend\src\modules\calendar-events\calendar-events.service.js`
- `C:\backend\src\modules\calendar-events\calendar-events.service.test.js`
- `C:\frontend-2\src\hooks\useAnnouncements.ts`
- `C:\frontend-2\src\hooks\useCalendarEvents.ts`
- `C:\frontend-2\src\components\common\Modal.tsx`
- `C:\frontend-2\src\pages\Calendar.tsx`
- `C:\frontend-2\src\pages\settings\TargetAudienceChips.tsx`
- `C:\frontend-2\src\pages\settings\AnnouncementsSettings.tsx`
- `C:\frontend-2\src\pages\settings\AnnouncementsSettings.test.tsx`
- `C:\frontend-2\src\pages\settings\CalendarEventsSettings.tsx`
- `C:\frontend-2\src\pages\settings\CalendarEventsSettings.test.tsx`

### Employee Pakistan Location Dropdowns

- Add Employee contact addresses now use Pakistan-only searchable location dropdowns.
- Country is locked to Pakistan.
- Province controls district, city, and town/area options.
- District remains optional, but is searchable/addable like city and town.
- HR can add a missing province, district, city, or town from the employee form.
- New location values are saved through the backend config API and refresh the dropdown data.

Files involved:
- `C:\backend\migrations\1712620828000_employee_location_options.sql`
- `C:\backend\src\modules\config\config.controller.js`
- `C:\backend\src\modules\config\config.service.js`
- `C:\backend\src\modules\config\config.service.test.js`
- `C:\backend\src\modules\employees\employees.schema.js`
- `C:\backend\src\modules\employees\employees.schema.test.js`
- `C:\frontend-2\src\hooks\useConfig.ts`
- `C:\frontend-2\src\pages\AddEmployee.tsx`
- `C:\frontend-2\src\pages\AddEmployee.test.tsx`

## Verification Already Run For Recent Work

Recent verification commands that passed:

- Frontend: `npm.cmd test -- --run`
- Frontend: `npm.cmd run build`
- Backend: `npm.cmd test`
- Backend: `npm.cmd run db:check`

Known recurring warnings:

- React Router future flag warnings in frontend tests.
- Browserslist data age warning.
- Vite chunk-size warning after build.

## Planned Features Not Yet Implemented

### Audit Logs Expansion

Audit Logs already cover the major persistent write flows and the UI now exposes actor and record filters. Keep extending coverage for any new write path, and keep the log read-only and Super Admin only.

### Department Head Role

Department Head is already implemented as a scoped role. Continue only where a route or UI surface still leaks broader HR access.

### Bulk Employee Upload

Bulk upload already exists. Keep tightening validation, preview editing, and post-import follow-up actions.

## Final Response Rules For Future Agents

- Say exactly what changed.
- Mention files touched at a high level.
- Include verification commands and results.
- Call out anything not verified.
- Keep summaries concise. Do not repeat the entire project history.
