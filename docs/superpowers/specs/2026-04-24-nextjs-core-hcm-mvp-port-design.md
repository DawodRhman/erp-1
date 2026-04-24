# Next.js Core HCM MVP Port (Prototype → Final Product) — Design Spec

Date: 2026-04-24

## Goal
Port the **UI theme + layouts + core HCM pages** from `client/prototype` (Vite) into `client/final_product` (Next.js App Router) and wire them to the existing EMS backend APIs with **JWT auth** and **RBAC enforced by backend**.

This is a **2-day delivery MVP**: it intentionally excludes prototype-only modules that are not part of the Core HCM path.

## Locked Decisions
- **Scope**: Core HCM MVP (Employee Info + Attendance + Leave + self-service).
- **Auth/API approach**: **UI-only + direct backend calls** (JWT stored client-side; frontend sends `Authorization: Bearer <token>`).
- **No git push/commit** by Codex; code changes are fine for manual review.

## In Scope (MVP Pages)
We will create Next.js routes that match the prototype UX but only for these modules:

Public:
- `/login`

HR + Super Admin app:
- `/launchpad` (role switcher / entry page)
- `/dashboard` (basic KPIs from existing endpoints where possible; otherwise minimal placeholder cards)
- `/employees` (list)
- `/employees/add` (create)
- `/employees/[uuid]` (view + edit)
- `/attendance` (daily grid + batch save + ack status)
- `/leave` (requests + balances + calendar)

Employee self-service app:
- `/me/dashboard`
- `/me/attendance` (including attendance ack)
- `/me/leave`
- `/me/profile` (read-only or minimal editable fields depending on backend support)

## Out of Scope (Explicitly Not Shipped In This MVP)
Prototype modules that are not backed by current backend scope:
- Payroll, Promotions, Accounts, Audit Log, Penalties, Tax/Payroll settings, Custom Fields, Announcements/Directory (unless already supported by backend routes).

UI navigation items for these will be **hidden** (not shown) to avoid dead pages.

## Auth, Roles, and Session Rules
### Tokens
- On successful login, store JWT in `localStorage` under a single key (e.g. `ems_token`).
- Store a minimal `session` object in `localStorage` (user id/email, role, employee uuid if present).
- Logout clears token + session.

### Role selection
Prototype has `activeRole` switching. For MVP:
- If backend returns a single role: use it.
- If backend supports multiple roles per user: allow selecting `activeRole` and store it in `localStorage`.
- Backend remains the authority: UI role is only used for navigation gating; server decides final allow/deny.

### Route protection
- Client-side guard in layouts:
  - If no token: redirect to `/login`.
  - If role doesn’t match: redirect to `/launchpad` (or `/me/*`).
- Never rely on UI guard for security; it’s UX only.

## API Wiring
### Base URL
- Use `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000/api`).
- All fetches are `fetch(`${API_BASE_URL}/...`)` with `Authorization` header.

### CORS / Dev Ports
Important constraint: backend runs on `http://localhost:3000`.
- Next dev server must run on **a different port** (e.g. `3001`) to avoid conflict.
- If backend doesn’t already allow CORS from `http://localhost:3001`, we will add a minimal backend CORS allowlist for dev.

### API client
Create a small client helper:
- Adds auth header automatically.
- Parses JSON safely.
- Normalizes errors to `{ status, error, details }` using backend’s `{ error: "..." }` shape.

## Validation and Input Safety (Frontend)
- Frontend forms use Zod (same shapes as backend expectations where possible).
- Reject empty payload submits for write actions (prevents accidental 400/500 spam).
- Display backend validation errors verbatim (do not invent messages).

## Styling / Theme Port
- Port `client/prototype/src/index.css` design tokens and component classes into Next:
  - Copy CSS variables and shared utility classes into `client/final_product/src/app/globals.css`.
  - Keep existing Tailwind v4 setup, but MVP UI will rely primarily on the ported CSS classes for parity.
- Fonts:
  - Replace Google CSS `@import` with Next font loading (or keep import temporarily for speed, then replace).

## Implementation Milestones (2 Days)
Day 1:
- App shell: layouts, sidebar/topbar, route guards, login/logout, API client.
- Employees module: list + detail view + edit (self-service constraints respected by backend).

Day 2:
- Attendance: daily view + batch save + ack flow.
- Leave: requests + balances + calendar.
- Polish: loading states, error toasts, empty states, navigation cleanup.

## Success Criteria
- Prototype look/feel preserved for the MVP pages.
- Login works against backend; JWT sent on every request.
- Employee self-service cannot access other employees’ records (verified by backend 403 + UI behaves gracefully).
- Attendance ack works end-to-end (HR writes, employee acks).

