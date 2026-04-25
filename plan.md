# EMS ERP Migration Plan (Next.js App Router + Existing EMS Backend)

## Summary
- Use `D:\Desktop\EMS\client\final_product` as the Next.js production app, with **Next-owned BFF API** (`/api/*`) to enforce **httpOnly JWT cookies**, route guards, and self-service isolation.
- Keep `D:\Desktop\EMS\backend` as system-of-record for HCM data; add missing backend modules (calendar events, notifications, pending actions, urgent alerts) with **`created_at` + `updated_at`** everywhere and **no delete APIs**.
- Enforce **URL-driven lazy loading** for employee detail and dashboard UI state (`?tab=...`, `?range=6m|12m`, `?search=EMP002`).

## Preflight Research (non-mutating; must complete before coding)
- Next runtime constraints: read `D:\Desktop\EMS\client\final_product\node_modules\next\dist\docs\` for middleware + cookies + route handlers behavior in this Next version.
- Backend capability gap scan:
  - Confirm **no** penalties/promotions endpoints exist (current: none found); decide which routes/pages are **Coming Soon** only.
  - Confirm leave/attendance endpoints + exact error shapes from `D:\Desktop\EMS\backend\API_ROUTES.md`.
- Data model feasibility:
  - Verify `job_info` lacks probation/contract fields (current: none) → proceed with adding `probation_end_date` + `contract_end_date` columns.

## Security & Session Architecture (Next “BFF-first”)
- Replace localStorage auth (`src/contexts/AuthContext.tsx`, `src/lib/api.ts`) with **httpOnly cookie** session:
  - Cookie: `ems_jwt` (httpOnly, `SameSite=Lax`, `Path=/`, `Secure` in prod).
  - Add CSRF for mutations: `ems_csrf` (non-httpOnly) + require `x-csrf-token` on non-GET `/api/*`.
- Implement `src/lib/auth.ts` (server-only):
  - Read `ems_jwt` via `cookies()`, verify JWT signature using `JWT_SECRET`, return `{ user_id, role, employee_id, is_super_admin }`.
- Add `src/middleware.ts` route guards (role-based):
  - Redirect unauthenticated to `/login`.
  - Block `/config/*` unless `super_admin`.
  - Enforce “self portal” isolation on `/me/*` regardless of HR permissions.
- Next Route Handlers:
  - `POST /api/auth/login`: call backend `POST /api/auth/login`, set `ems_jwt` cookie, return `{ user }`.
  - `POST /api/auth/logout`: clear cookies.
  - `GET /api/auth/session`: return decoded session (for client UI only).
  - `/api/proxy/*`: forward to backend with `Authorization: Bearer <cookieToken>`, pass-through status + JSON error bodies unchanged.

## Data Models & Backend Additions (Express + node-pg-migrate; no deletes)
### Migrations (SQL)
- Add columns to `job_info`:
  - `probation_end_date date null`
  - `contract_end_date date null`
- Add new tables (all include `id uuid default gen_random_uuid()`, `created_at`, `updated_at`, updated_at trigger):
  - `calendar_events`: `type`, `date`, `title`, `visibility`, `created_by`, `updated_by`
  - `notifications`: `user_id null`, `role null`, `type`, `message`, `is_read default false`, `created_by`
  - `pending_actions`: `employee_id`, `missing_fields jsonb`, `status (open/resolved)`, `resolved_by null`, `resolved_at null`
  - `urgent_alerts`: `employee_id`, `type`, `expiry_date`, `status`, `updated_by`
### Migration Rollback Strategy
- Add down migrations for the Task 8 migration set covering `calendar_events`, `notifications`, `pending_actions`, `urgent_alerts`, and the `job_info` columns (`probation_end_date`, `contract_end_date`).
- Roll back in reverse creation order: `urgent_alerts` -> `pending_actions` -> `notifications` -> `calendar_events` -> `job_info` columns.
- Add the probation/contract columns on `job_info` as nullable columns so rollback is non-destructive and only removes newly added nullable fields.
### RBAC + Routes
- Add permission keys + seed:
  - `calendar:read`, `calendar:write`
  - `notifications:read`, `notifications:write`
  - `alerts:read` (HR/Super), `pending_actions:read` (HR/Super)
- Endpoints (Zod-validated; exact backend error shapes preserved):
  - `GET /api/calendar-events?from&to` (all auth)
  - `POST/PUT /api/calendar-events` (HR/Super only)
  - `GET /api/notifications?scope=me` (all auth; resolves by `user_id` + `role`)
  - `POST /api/notifications` (HR/Super), `PATCH /api/notifications/:id/read` (self-only)
  - `GET /api/pending-actions` (HR/Super): compute from `employee_info` + `extra_employee_info` missing bank/emergency/etc; optionally persist snapshots to table.
  - `GET /api/urgent-alerts?days=30` (HR/Super): compute from `job_info.probation_end_date/contract_end_date`.
- Add `GET /api/dashboard/metrics?range=6m|12m` (HR/Super; ISR-friendly) returning:
  - total employees, new joined this month, % change vs previous month
  - present today + % of total
  - on leave today + pending/approved counts
  - penalties metric: return `{ coming_soon: true, count: 0, amount_pkr: 0 }` until module exists

## UI Implementation (Next.js App Router; strict Server/Client boundaries)
### Global UI constraints enforcement
- Refactor `src/app/globals.css`:
  - Remove gradients, emoji text, and decorative shadows; keep neutral palette.
  - Introduce `--radius-sm`, `--radius-md` tokens; ensure all components use only these.
- Create reusable UI primitives in `src/components/*` (`Card`, `Button`, `Pill`, `Table`, `Badge`, `ComingSoonOverlay`).

### Error Boundary Strategy
- Each Server Component page must include a co-located `error.tsx` that renders a neutral inline error state instead of a full-page crash.
- Data-fetch errors should render an empty state with a retry hint.
- Auth errors should redirect to `/login`.
- No unhandled promise rejections should surface to the user.

### Dashboards
- HR/Super dashboard (`/dashboard`):
  - Server Component page fetches metrics (ISR via `revalidate`).
  - Client Components only for charts + notification dropdown interactions.
  - Match prototype layout blocks from `prototype/src/pages/Dashboard.tsx`, but:
    - Remove “Add Employee” from header (keep Quick Actions only).
    - Add Notification Bell (not present in prototype dashboard).
- Employee self dashboard (`/me/dashboard`):
  - Server Component renders Profile Card + sections.
  - Client Components: Apply Leave modal + Attendance Acknowledge mutation (React Query).
  - Enforce “strictly self-only” by sourcing employee_id from session only.

### Employee Directory + On-demand Detail (HR/Super)
- Route: `/employees?search=EMP002&tab=attendance` (locked choice).
- Server page behavior:
  - If `search` empty → directory table (server fetch `/employees?search=` only when search present).
  - If `search` resolves to exactly 1 employee → render detail header + tab bar, and fetch **only the active tab**:
    - `tab=personal` → `/employees/:uuid`
    - `tab=job-info` → add backend support `GET /job-info?employee=EMP002` (or equivalent) to avoid full table fetch
    - `tab=attendance` → `/attendance/report` + `/attendance/daily` as needed
    - `tab=leave` → `/leave-requests?employee=EMP002` + `/leave-requests/balances` extended to accept `employee` for HR-only usage
- Client tab switch updates URL (`router.replace`) only; no bulk prefetch.

### State Management Standard
- Add React Query for all mutations + optimistic UI where safe:
  - `attendance ack`, `leave apply`, `leave approve/reject`, `notification mark read`.
- Keep URL params as the single source for:
  - tab selection, dashboard range, directory search/filters.

## Notification Delivery (locked choice)
- Implement **polling**:
  - `GET /api/notifications?scope=me` returns items + `unread_count`.
  - Client bell dropdown uses React Query polling configured via environment variable or query client defaults; polling/stale-time values should not be specified in this plan doc.

## Test Plan (acceptance-focused)
- Security:
  - No localStorage token usage; `ems_jwt` is httpOnly and required for all authenticated routes.
  - Middleware denies `/config/*` to HR; denies all app routes when unauthenticated.
  - `/me/*` always renders self-only data even for HR users.
- Lazy loading:
  - Navigating `/employees?search=EMP002&tab=job-info` triggers only job-info fetches; switching tabs does not trigger other tab fetches.
- RBAC:
  - Run backend scripts: `node scripts/api-security-check.mjs` and ensure no unexpected allows on new routes.
- Data correctness:
  - Upcoming birthdays, pending actions, urgent alerts return stable results given seeded data (or empty states with correct UI).
- UX:
  - Coming Soon overlay matches exact pattern: `opacity-30 pointer-events-none backdrop-blur-[2px]` with badge, layout visible.

## Conversation Context Logging (requirement)
- Add a lightweight script in repo to append each turn into a single Markdown log (one file, date-stamped sections), and run it as part of the workflow after each assistant response (manual trigger until automated).

## Assumptions (explicit defaults)
- Backend remains authoritative; Next `/api/*` acts as BFF proxy to enable same-origin cookies.
- Penalties/promotions modules ship as “Coming Soon” pages + placeholder metric until backend tables/endpoints exist.
- `date_of_birth` remains `YYYY-MM-DD` string; birthdays computed by parsing ISO strings (no DB type migration in v1).
