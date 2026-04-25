# EMS ERP Migration `tasks.md` Blueprint

## Requirements Trace
- `REQ-SEC`: httpOnly JWT cookies, CSRF for mutations, middleware route guards, backend RBAC remains authoritative.
- `REQ-UI`: enterprise UI only: neutral palette, no emojis, no gradients, no decorative shadows, consistent `radius-sm` / `radius-md`.
- `REQ-LAZY`: URL-driven tabs/search/range; server fetches only requested data.
- `REQ-SELF`: employees strictly self-only; HR/Super can access `/me/*` only for their assigned `employee_id`.
- `REQ-BE`: no delete APIs; Zod validation; stable error shapes; `created_at` + `updated_at`.
- `REQ-DASH`: HR/Super dashboard + Employee dashboard match prototype structure with corrected logic.
- `REQ-CAL-NOTIF`: calendar events, notifications, pending actions, urgent alerts.

# Execution Defaults (apply to all tasks below)
- Use existing Express + SQL migrations; do not introduce Prisma/Drizzle in this migration.
- Use `jose` for JWT verification in Next middleware/server code.
- Use Next Route Handlers as the BFF API surface; Server Actions are not used for this phase.
- Keep backend error bodies compatible with `API_ROUTES.md`.
- Do not add delete endpoints or destructive UI actions.

## Tasks

- [ ] 0. Create Implementation Tracker
  - [ ] 0.1 Create `D:\Desktop\EMS\client\final_product\tasks.md` from this checklist.
  - [ ] 0.2 Append only a concise summary to `D:\Desktop\EMS\backend\context.md` after saving the tracker.
  - [ ] 0.3 Keep `context.md` as the only conversation context file.
  - _Acceptance: tracker exists, context summary is appended, no duplicate context docs._
  - _Requirements: REQ-BE_

- [ ] 1. Preflight Verification And Current-State Audit
  - [ ] 1.1 Read Next 16 docs under `node_modules/next/dist/docs/` for cookies, middleware, route handlers, and caching before editing auth code.
  - [ ] 1.2 Confirm current frontend auth uses `localStorage` in `src/contexts/AuthContext.tsx` and `src/lib/api.ts`.
  - [ ] 1.3 Confirm backend routes are mounted in `server.js` and follow Model -> Service -> Controller.
  - [ ] 1.4 Confirm missing modules: calendar events, notifications, pending actions, urgent alerts, penalties, promotions.
  - [ ] 1.5 Record any discovered route mismatch in `tasks.md` before implementation continues.
  - _Acceptance: implementation notes identify exact existing files and confirmed gaps._
  - _Requirements: REQ-SEC, REQ-BE_

- [ ] 2. Frontend Dependency And Configuration Setup
  - [ ] 2.1 Install `@tanstack/react-query`, `jose`, and `zod` in `final_product`.
  - [ ] 2.2 Add `BACKEND_API_URL=http://localhost:3000/api` and document required `JWT_SECRET` parity with backend.
  - [ ] 2.3 Keep Tailwind v4 CSS-based setup; do not add `tailwind.config.js`.
  - [ ] 2.4 Verify `npm run build` still reaches compilation after dependency setup.
  - _Acceptance: dependencies are in `package.json`, env names are documented, no Tailwind config file added._
  - _Requirements: REQ-SEC, REQ-UI_

- [ ] 3. Design System Foundation
  - [ ] 3.1 Refactor `src/app/globals.css` tokens to enterprise palette and radius names: `--radius-sm`, `--radius-md`.
  - [ ] 3.2 Remove bright gradients, emoji usage, and decorative shadow tokens from reusable classes.
  - [ ] 3.3 Normalize `.card`, `.btn`, `.input`, `.pill`, table, sidebar, and topbar styling to the new tokens.
  - [ ] 3.4 Keep existing `Outfit` + `IBM Plex Mono` unless font change is explicitly requested later.
  - [ ] 3.5 Create reusable primitives: `Button`, `Card`, `Badge`, `Pill`, `TableShell`, `ComingSoonOverlay`.
  - _Acceptance: UI has no gradient primary buttons, no emoji text, no oversized radius drift, and no nested card patterns._
  - _Requirements: REQ-UI_

- [ ] 4. Next Auth BFF And Cookie Session
  - [ ] 4.1 Create `src/lib/auth.ts` server-only helpers using `jose` to verify backend JWT from `ems_jwt`.
  - [ ] 4.2 Add `POST /api/auth/login`: validate payload with Zod, call backend login, set httpOnly `ems_jwt`.
  - [ ] 4.3 Add `POST /api/auth/logout`: clear `ems_jwt` and `ems_csrf`.
  - [ ] 4.4 Add `GET /api/auth/session`: return `{ user }` from verified cookie or `401`.
  - [ ] 4.5 Add CSRF helpers: set readable `ems_csrf`, require `x-csrf-token` on non-GET BFF routes.
  - _Acceptance: login no longer stores token in localStorage; auth failure returns stable `401`; mutation without CSRF returns `403`._
  - _Requirements: REQ-SEC_

- [ ] 5. Frontend Auth Context Migration
  - [ ] 5.1 Refactor `AuthContext` to store session user only, fetched from `/api/auth/session`.
  - [ ] 5.2 Update login page to call Next `/api/auth/login`, not backend directly.
  - [ ] 5.3 Update logout to call `/api/auth/logout` and clear client session state.
  - [ ] 5.4 Remove `ems_token` and `ems_user` localStorage reads/writes.
  - [ ] 5.5 Update `apiFetch` to call same-origin Next APIs and include CSRF on non-GET.
  - _Acceptance: browser storage contains no JWT; refresh preserves session via cookie._
  - _Requirements: REQ-SEC_

- [ ] 6. Route Guards And Launchpad Access
  - [ ] 6.1 Add `src/middleware.ts` with `jose` cookie verification.
  - [ ] 6.2 Redirect unauthenticated app routes to `/login`.
  - [ ] 6.3 Block `/config/*` unless role is `super_admin`.
  - [ ] 6.4 Allow `/me/*` for any authenticated user with `employee_id`; show unavailable state if no `employee_id`.
  - [ ] 6.5 Update Launchpad so HR/Super with `employee_id` sees Self-Service and Core HCM.
  - _Acceptance: employee cannot open HR routes; HR cannot open `/config/*`; HR with employee id can open `/me/dashboard`._
  - _Requirements: REQ-SEC, REQ-SELF_

- [ ] 7. BFF Proxy And Server Fetch Utilities
  - Note: proxy route extensions for calendar, notifications, pending-actions, and urgent-alerts (Tasks 7.1–7.4) cannot be integration-tested until Task 8 backend migrations and Task 10–12 backend modules are complete. Complete Task 8 through Task 12 before verifying those proxy paths.
  - [ ] 7.1 Add protected proxy route group for backend calls with cookie JWT -> Authorization header forwarding.
  - [ ] 7.2 Preserve backend status codes and JSON error bodies exactly.
  - [ ] 7.3 Add `serverFetchBackend()` for Server Components with `cache: "no-store"` by default.
  - [ ] 7.4 Add ISR-safe metric fetch helper that allows `next: { revalidate }` only for org aggregates.
  - _Acceptance: backend `422/403/404/409` pass through unchanged; no user-specific data is cached._
  - _Requirements: REQ-SEC, REQ-LAZY_

- [ ] 8. Backend Migration For New HCM Support Tables
  - [ ] 8.1 Add migration for `job_info.probation_end_date` and `job_info.contract_end_date`.
  - [ ] 8.2 Add `calendar_events` with `created_at`, `updated_at`, `created_by`, `updated_by`.
  - [ ] 8.3 Add `notifications` with `user_id`, `role`, `type`, `message`, `is_read`, `created_by`, timestamps.
  - [ ] 8.4 Add `pending_actions` with `employee_id`, `missing_fields jsonb`, `status`, `resolved_by`, `resolved_at`, timestamps.
  - [ ] 8.5 Add `urgent_alerts` with `employee_id`, `type`, `expiry_date`, `status`, `updated_by`, timestamps.
  - [ ] 8.6 Add updated_at triggers for every new/changed table following existing migration style.
  - _Acceptance: `npm run db:check` reports migration plan; no DROP/DELETE behavior introduced._
  - _Requirements: REQ-BE, REQ-CAL-NOTIF_

- [ ] 9. Backend Permissions And Seeds
  - [ ] 9.1 Seed permission keys: `calendar:read`, `calendar:write`, `notifications:read`, `notifications:write`, `alerts:read`, `pending_actions:read`.
  - [ ] 9.2 Assign read permissions to all authenticated roles where needed.
  - [ ] 9.3 Assign write permissions for calendar/notifications only to HR roles and Super Admin.
  - [ ] 9.4 Extend full mock seed with calendar events, notifications, job probation/contract dates, and missing-field examples.
  - _Acceptance: security runner can log in all seed users and see expected role permissions._
  - _Requirements: REQ-SEC, REQ-BE, REQ-CAL-NOTIF_

- [ ] 10. Backend Calendar Events Module
  - [ ] 10.1 Add `calendar-event.schema.js` with Zod validation for params/query/body.
  - [ ] 10.2 Add model/service/controller/routes for `GET /api/calendar-events?from&to`.
  - [ ] 10.3 Add HR/Super `POST /api/calendar-events`.
  - [ ] 10.4 Add HR/Super `PUT /api/calendar-events/:id`; store `updated_by`.
  - [ ] 10.5 Register routes in `server.js`.
  - _Acceptance: all roles can read relevant events; HR can edit another HR-created event and response shows editor identity._
  - _Requirements: REQ-BE, REQ-CAL-NOTIF_

- [ ] 11. Backend Notifications Module
  - [ ] 11.1 Add `notification.schema.js` with Zod validation.
  - [ ] 11.2 Add `GET /api/notifications?scope=me` returning `{ unread_count, items }`.
  - [ ] 11.3 Add `PATCH /api/notifications/:id/read` enforcing self-only read marking.
  - [ ] 11.4 Add HR/Super `POST /api/notifications` for user-targeted or role-targeted notifications.
  - [ ] 11.5 Register routes and permissions.
  - _Acceptance: employee sees only own/role feed; cannot mark another user’s notification read._
  - _Requirements: REQ-SEC, REQ-SELF, REQ-CAL-NOTIF_

- [ ] 12. Backend Pending Actions And Urgent Alerts
  - [ ] 12.1 Add `GET /api/pending-actions` for HR/Super derived from missing `extra_employee_info` banking/emergency/contact fields.
  - [ ] 12.2 Add `GET /api/urgent-alerts?days=30` from `job_info.probation_end_date` and `contract_end_date`.
  - [ ] 12.3 Validate query params and clamp `days` to an allowed range.
  - [ ] 12.4 Return stable empty arrays when no records exist.
  - _Acceptance: employee receives `403`; HR/Super receive deterministic lists with employee id/name/type/due date._
  - _Requirements: REQ-BE, REQ-CAL-NOTIF_

- [ ] 13. Backend Dashboard Metrics Endpoint
  - [ ] 13.1 Add `GET /api/dashboard/metrics?range=6m|12m`.
  - [ ] 13.2 Return top metrics: total employees, joined this month, employee % change, present today, present %, leave today, pending/approved leave counts.
  - [ ] 13.3 Return chart series: monthly attendance and headcount trend.
  - [ ] 13.4 Return penalties placeholder `{ coming_soon: true, count: 0, amount_pkr: 0 }` until penalty backend exists.
  - [ ] 13.5 Validate `range` and require HR/Super access.
  - _Acceptance: endpoint is ISR-safe and does not include employee-private fields._
  - _Requirements: REQ-DASH, REQ-BE_

- [ ] 14. React Query Provider And Mutation Standards
  - [ ] 14.1 Add `QueryClientProvider` in `src/app/providers.tsx`.
  - [ ] 14.2 Create shared mutation helper for JSON requests, CSRF header, and backend error mapping.
  - [ ] 14.3 Standardize `422` form error handling for leave modal and editable forms.
  - [ ] 14.4 Use optimistic updates only for safe local UI state: notification read, attendance ack badge, modal close state.
  - _Acceptance: mutations consistently show field errors and never hide backend RBAC errors._
  - _Requirements: REQ-SEC, REQ-LAZY_

- [ ] 15. HR/Super Dashboard Implementation
  - [ ] 15.1 Convert `/dashboard` to a Server Component page.
  - [ ] 15.2 Fetch metrics server-side with `next: { revalidate: 300 }`.
  - [ ] 15.3 Implement Top Metrics cards from backend metric response.
  - [ ] 15.4 Implement Quick Actions as Client Component: Approve Leave, Mark Attendance, Add Employee, Record Promotion, Add Penalty.
  - [ ] 15.5 Mark Promotion and Penalty actions as Coming Soon if backend routes are not implemented.
  - [ ] 15.6 Implement charts with server-provided data and client-only rendering.
  - [ ] 15.7 Add Birthday/Anniversary calendar, Pending Actions, Urgent Alerts, Announcements/Events, Recent Activity.
  - [ ] 15.8 Add Notification Bell polling dropdown with timestamps and unread badge.
  - _Acceptance: no header Add Employee button; dashboard keeps prototype structure with enterprise styling._
  - _Requirements: REQ-DASH, REQ-UI, REQ-CAL-NOTIF_

- [ ] 16. Employee Self Dashboard Implementation
  - [ ] 16.1 Convert `/me/dashboard` to Server Component for profile, shift, summaries, and calendar preview.
  - [ ] 16.2 Fetch all self data using session `employee_id`; never accept employee id from client URL.
  - [ ] 16.3 Add Client Attendance Ack component using `PATCH /attendance/:attendanceId/ack`.
  - [ ] 16.4 Make ack button visible only when attendance exists and is unacknowledged.
  - [ ] 16.5 Add Client Apply Leave modal with balance-aware date validation.
  - [ ] 16.6 Add leave wallet, working-days/present-days summary, pending requests, and leave request table.
  - [ ] 16.7 Add My Team Coming Soon section with required overlay style.
  - _Acceptance: employee sees no peer data; ack is immutable after success; invalid leave range shows exact balance error._
  - _Requirements: REQ-SELF, REQ-DASH, REQ-UI_

- [ ] 17. Employee Directory And URL-Driven Detail Tabs
  - [ ] 17.1 Convert `/employees` to Server Component controlled by `searchParams`.
  - [ ] 17.2 Implement Google-style search dropdown as Client Component.
  - [ ] 17.3 Search by `EMP002` or name and preserve URL as `/employees?search=EMP002&tab=attendance`.
  - [ ] 17.4 Implement filters: department, status, working mode, location, termination/resignation.
  - [ ] 17.5 Implement table columns: Name, ID, Dept, Designation, Type, Shift, Status, Join Date, Actions.
  - [ ] 17.6 Resolve active employee from `search`; if exactly one match, render detail tabs.
  - [ ] 17.7 Fetch only active tab data: personal, job-info, medical, attendance, leave, payslips, promotions, penalties, activity, documents.
  - [ ] 17.8 Use Coming Soon panels for tabs without backend support.
  - _Acceptance: switching tabs changes URL and does not fetch unrelated tabs._
  - _Requirements: REQ-LAZY, REQ-DASH, REQ-UI_

- [ ] 18. Backend Query Support For Lazy Employee Tabs
  - [ ] 18.1 Add or extend HR-safe query endpoints needed by tabs without loading whole tables.
  - [ ] 18.2 Add `GET /api/job-info?employee=EMP002` with self-service enforcement.
  - [ ] 18.3 Extend leave balances/requests filters to support HR employee-specific lookup where missing.
  - [ ] 18.4 Ensure attendance report/daily endpoints support employee filter with validation.
  - [ ] 18.5 Preserve employee self-only behavior for all new query paths.
  - _Acceptance: frontend detail tabs never need full `job-info` table to render one employee._
  - _Requirements: REQ-LAZY, REQ-SELF, REQ-BE_

- [ ] 19. Existing Pages Alignment And Coming Soon Coverage
  - [ ] 19.1 Audit `/attendance`, `/leave`, `/employees/add`, `/me/attendance`, `/me/leave`, `/me/profile`.
  - [ ] 19.2 Replace direct backend calls with BFF calls and cookie session.
  - [ ] 19.3 Remove remaining localStorage auth assumptions.
  - [ ] 19.4 Apply enterprise CSS primitives and remove prototype-only visual noise.
  - [ ] 19.5 Add Coming Soon overlays for payroll, payslips, promotions, penalties, documents, and profile update request where backend is absent.
  - _Acceptance: for each audited page — /attendance, /leave, /employees/add, /me/attendance, /me/leave, /me/profile — confirm: (a) no direct backend calls exist (all go through BFF), (b) no localStorage auth reads/writes remain, (c) enterprise CSS primitives applied, (d) Coming Soon overlays present where backend is absent. Audit output is a checklist comment in tasks.md under 19.1 before marking complete._
  - _Requirements: REQ-SEC, REQ-UI_

- [ ] 20. Security Automation Updates
  - [ ] 20.1 Update route middleware audit expectations for new backend routes.
  - [ ] 20.2 Extend security runner to cover calendar, notifications, pending actions, urgent alerts, dashboard metrics.
  - [ ] 20.3 Add deep checks: employee cannot read peer notifications/actions/alerts.
  - [ ] 20.4 Add auth-bypass checks for every new route.
  - _Acceptance: `node scripts/api-security-check.mjs` reports zero unexpected allows._
  - _Requirements: REQ-SEC, REQ-BE_

- [ ] 21. Verification And Regression Pass
  - [ ] 21.1 Backend: run `npm run db:check`.
  - [ ] 21.2 Backend: run `npm run db:migrate`, `npm run db:seed:full`.
  - [ ] 21.3 Backend: run `node scripts/api-security-check.mjs` and `node scripts/route-middleware-audit.mjs`.
  - [ ] 21.4 Frontend: run `npm run lint` and `npm run build`.
  - [ ] 21.5 Browser smoke: login as Super Admin, HR, Employee; verify launchpad options and route guards.
  - [ ] 21.6 Browser smoke: verify `/employees?search=EMP002&tab=attendance` lazy behavior and employee `/me/dashboard` self-only data.
  - _Acceptance: all checks pass or failures are documented as unrelated pre-existing issues._
  - _Requirements: all_
