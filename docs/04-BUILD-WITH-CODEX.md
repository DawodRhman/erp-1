# TRACK360 — How to build with OpenAI Codex

## Setup (one time)

1. Put the files in the repo:
   - `AGENTS.md` at the repo root (Codex reads it automatically)
   - `docs/01-PRD.md`, `docs/02-DESIGN-SYSTEM.md`, `docs/03-ARCHITECTURE.md`
2. Work on a new git branch for every task. Never let Codex work directly on `main`.
3. Give Codex **one phase (or one module) at a time**. Big prompts like "build the whole ERP" produce weak, inconsistent code.
4. After every task: review the diff, run `pnpm lint && pnpm typecheck && pnpm test`, try it in the browser, then merge.
5. If Codex drifts from the documents, reply: "Re-read docs/0X and AGENTS.md section Y, then fix your change."

Order to follow: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 (one module at a time) → 7 → 8.

---

## MASTER PROMPT (paste at the start of every new Codex session)

```
You are the lead engineer on TRACK360 ERP for ESSPL.

Before doing anything:
1. Read AGENTS.md completely.
2. Read docs/01-PRD.md, docs/02-DESIGN-SYSTEM.md and docs/03-ARCHITECTURE.md.
3. Inspect the existing repositories/folders (erp-1 backend, erp-2 frontend) and summarize how they are structured today.

Rules for this session:
- The documents are the source of truth. If two documents conflict or something is unclear, stop and ask me instead of guessing.
- Work in small steps. For each task: state a short plan, implement, add tests, run lint + typecheck + tests, then report.
- Do not do a big-bang rewrite. Migrate existing code gradually and keep the app working after every step.
- Never break the domain rules in AGENTS.md section 4.
- Do not invent features that are not in the PRD. Do not leave mock data, TODO stubs, or commented-out code.
- Finish every task with a report: what changed, files touched, tests run and their results, risks, and anything not done.

Confirm you have read the documents by listing: the four workspaces, the ten record codes in the record chain, and the five hard release gates you consider most important. Then wait for my task.
```

---

## PHASE 0 — Audit and plan (no code changes)

```
Task: Audit the current code against the three documents. Do NOT change code.

Produce a file docs/MIGRATION-PLAN.md containing:
1. Current structure of erp-1 and erp-2 (folders, modules, DB tables, routes, roles).
2. Gap table: each PRD module/page vs what exists (Exists / Partial / Missing / Wrong name).
3. List of terminology violations (Portal, Token, Installer, Client Request, Super Admin in business screens, etc.) with file paths.
4. Domain-rule risks: places where release gates, cost isolation, idempotency or transactions are missing.
5. A step-by-step migration plan in small PR-sized steps, ordered by risk, ending at the target monorepo structure in docs/03-ARCHITECTURE.md section 18.
6. Questions for me (max 10) where documents or code are unclear.
```

## PHASE 1 — Repository foundation

```
Task: Set up the monorepo foundation per docs/03-ARCHITECTURE.md section 18 without breaking existing behavior.

Do:
- pnpm workspaces: apps/web, apps/api, apps/worker, packages/shared, packages/ui, packages/config.
- Move existing frontend and backend into apps/web and apps/api step by step (git mv, keep history), keep them running.
- Shared TypeScript, ESLint, Prettier configs in packages/config.
- Docker Compose for local: postgres, redis, minio, mailhog, plus scripts in root package.json (dev, lint, typecheck, test, build, db:migrate, db:seed).
- GitHub Actions (or existing CI) running lint, typecheck, unit and integration tests with Postgres and Redis service containers.
- .env.example files with placeholders only.

Acceptance: fresh clone + pnpm install + pnpm dev starts everything; CI is green; no behavior change for users.
```

## PHASE 2 — Design system and app shell

```
Task: Implement the design system from docs/02-DESIGN-SYSTEM.md in packages/ui and rebuild the app shell in apps/web.

Do:
- Design tokens (exact hex values from section 3, "Harbor Navy" theme) as CSS variables + TypeScript exports. No hard-coded colors in components.
- Components: Button, StatusBadge, Input/Select (async searchable)/DatePicker/MoneyInput, DataTable (server pagination, virtualization, column chooser, saved views), Tabs, StatusBar (stepper), SmartLinkBar, KpiCard, EmptyState, Skeleton, Toast, Banner, Dialog, Drawer, CommandPalette (Ctrl+K), Chatter panel shell, Avatar, Breadcrumb.
- App shell: navy sidebar, top bar (workspace switcher, breadcrumb, global search, notifications, activities, branch selector, account menu), responsive drawer navigation.
- Page templates: DashboardPage, ListPage, FormPage, KanbanPage, ReportPage, PrintableDocument.
- Unified login page with no workspace picker.
- Storybook (or equivalent) showing every component in every state, with axe accessibility checks.

Acceptance: WCAG AA contrast on all token pairs, keyboard operable, works at 360 px and 1440 px, tests for key components.
```

## PHASE 3 — Identity, RBAC, branches, audit

```
Task: Implement Identity & Access and Governance & Audit per PRD section 4 and architecture sections 5, 9.

Do:
- Users, roles (4 default role keys), permissions (action-based keys), user-role and user-branch assignment, custom roles, permission matrix UI under Management > Users & Roles.
- Login with Argon2id, throttling and lockout, forced password change, HttpOnly Secure SameSite cookies, rotating refresh tokens, CSRF protection.
- Redirect to the correct workspace after login and restore it after refresh and across tabs.
- requirePermission middleware on every route + a test that fails if any route has no declared permission.
- Record-scope filtering (own/team/branch/all) in the repository layer.
- Field-level serializer that strips cost and margin without cost.view.
- Append-only audit events (partitioned table) + Audit Log page with filters.
- Seed roles, permissions and demo users for local/staging only.

Acceptance: unauthorized API calls return 403, menus match permissions, audit written for login, role change, permission change. Include security tests.
```

## PHASE 4 — Platform services (outbox, events, notifications, chatter)

```
Task: Build the platform foundation per docs/03-ARCHITECTURE.md sections 6, 7, 12, and PRD section 9.

Do:
- outbox and inbox tables, outbox relay worker, BullMQ queues, retry with backoff and jitter, dead-letter queue and a replay script.
- Typed event contracts in packages/shared (versioned, .v1).
- Idempotency-Key middleware (24h store) for create and irreversible endpoints.
- Number sequences service (prefix, year reset, branch code) using advisory locks.
- Notification service: in-app (SSE) + email via templates; failures recorded and retryable, never rolling back business transactions.
- Chatter (notes, mentions, timeline), activities (to-dos), attachments (pre-signed upload, scan status, signed download), custom fields engine, saved views.
- Request ID / correlation ID, structured JSON logging, OpenTelemetry tracing, Prometheus metrics endpoint.

Acceptance: duplicate event ignored, duplicate POST with the same key returns the same result, Redis outage does not lose events (outbox in Postgres), tests for each.
```

## PHASE 5 — Infrastructure and observability

```
Task: Produce production-ready infrastructure per docs/03-ARCHITECTURE.md sections 4, 13, 14, 16.

Do:
- Production Dockerfiles (multi-stage, non-root, healthchecks) for web, api, worker.
- Deployment manifests in infra/ for the topology in section 4.1 (3 api replicas, 2 workers, PgBouncer, Postgres primary + replica, Redis with replica, object storage, reverse proxy with TLS and rate limits). Provide both docker-compose.prod.yml and Kubernetes manifests (or Helm).
- Graceful shutdown, liveness/readiness endpoints, connection pool limits matching section 4.2.
- Prometheus, Grafana dashboards and alert rules from section 13; Loki for logs.
- PostgreSQL backup and WAL archiving config + restore runbook in docs/RUNBOOK.md.
- Migration job that runs before deploy (expand-only).
- k6 load test scripts in infra/k6 for the mixed scenario, spike and stock-concurrency test.

Acceptance: staging deploy from scratch with one command, rolling deploy with zero failed requests, restore drill documented and executed once, load test report saved in docs/LOAD-TEST.md.
```

## PHASE 6 — Business modules (repeat this prompt once per module)

Order: **Sales → Approvals → Inventory → Purchasing → Field Service → Finance → Management**.

```
Task: Implement the <MODULE NAME> module end to end.

Read first: docs/01-PRD.md section <SECTION>, docs/02-DESIGN-SYSTEM.md page templates, docs/03-ARCHITECTURE.md sections 3, 5, 7, 8.

Do:
- Database migrations in the module's own schema (with indexes for every filter, version column, audit columns).
- Backend module: routes, service, repository, Zod schemas in packages/shared, permissions, state machine for statuses in PRD section 10, events in section 7.3 of the architecture doc, audit events.
- Enforce every release gate that touches this module (AGENTS.md section 4), with idempotency and version checks.
- Frontend: all pages listed for this module in PRD section 5 using the correct page templates, dashboard with the exact heading (e.g. "Sales Dashboard") and KPIs from the PRD, status bar, smart links, chatter, saved filters, empty/loading/error states, responsive layout.
- Print/PDF documents where the PRD requires them.
- Tests: unit (calculations, state machine), integration (transactions, idempotency, outbox), contract, security (403, record scope, cost leak), and one Playwright test for the happy path and one for a blocked gate.

Do not implement other modules. Where this module depends on another, use its public interface or events only. Finish with the report described in AGENTS.md section 10.
```

Module-specific hints to add after the prompt:

- **Sales:** duplicate client detection, quotation versions, discount-triggered approval, secure review link page, one-time order release.
- **Approvals:** rule engine (amount, margin, discount, currency), multi-level, delegate, reminders, separation of duties.
- **Inventory:** row-locked reservations, serial and batch tracking, reorder rules, stock ledger partitioning, cost isolation.
- **Purchasing:** shortage-to-PO prefill, partial receipts, exactly-once stock posting.
- **Field Service:** issue gate, sign-off capture, closeout math (original, deductions, extras, tax, final), immutability after billing submission.
- **Finance:** billing queue, invoice edit with reason and before/after audit, snapshots, payment allocation, ageing report, Zero-Balance Closure.
- **Management:** Executive Dashboard from read models, users and roles, settings pages, System Health.

## PHASE 7 — Reporting, search, performance

```
Task: Implement read models, global search, and performance hardening per docs/03-ARCHITECTURE.md sections 5.2, 11, 12.

Do:
- Projection workers building: control tower, inventory summary, finance monthly summary, client 360, record trail.
- Dashboards (all four) reading from read models on the replica, under 2 seconds with seeded volume data (100k quotations, 1M stock movements).
- Global search (Ctrl+K) using Postgres full-text + pg_trgm from a search index fed by events, permission-filtered.
- Query plan tests for every list endpoint; add missing indexes; convert deep pagination to keyset.
- Run the k6 load test and record results against PRD section 12.1 targets. Fix bottlenecks and document them.

Acceptance: PRD acceptance criteria 13 to 17 pass.
```

## PHASE 8 — Hardening and release

```
Task: Prepare release candidate.

Do:
- Run the full four-role end-to-end Playwright test from requirement to payment with a blocked-gate case at each gate.
- Security review against AGENTS.md section 7: dependency and container scans, secrets scan, CSRF, rate limits, upload scanning, permission-coverage test.
- Accessibility audit (axe + manual keyboard pass) on all page templates.
- Restore drill and failover drill, documented.
- Update docs (PRD, design system, architecture) so they match what is built; list deviations.
- Produce docs/RELEASE-CHECKLIST.md with go/no-go items and a rollback plan.
```

---

## Handy follow-up prompts

**Bug fix:**
```
Bug: <what you see, steps, expected vs actual, paste error or screenshot text>.
Find the root cause first, explain it in 3 lines, add a failing test that reproduces it, fix it with the smallest safe change, and run lint, typecheck and tests.
```

**Review a diff:**
```
Review the current branch against AGENTS.md and the docs. List violations of domain rules, missing permission checks, cost-leak risks, missing idempotency, missing tests, wrong terminology, hard-coded colors, and performance risks (N+1, missing indexes). Do not change code; give a prioritized list with file and line references.
```

**Rename terminology across the app:**
```
Find every user-facing occurrence of terms listed in PRD section 6 (old names) and replace with the glossary names. Update UI text, page titles, menu labels, emails, PDFs, API error messages and docs. Keep database column names unless a migration is planned. Add a lint or test that fails if forbidden terms appear in UI strings.
```

**Performance check:**
```
Profile the <endpoint or page>. Show the query plan and timings on seeded volume data, identify the bottleneck, propose 2 options with tradeoffs, implement the safer one, and prove the improvement with before/after numbers.
```

## Tips for best results

- Small task, clear acceptance criteria, one module: Codex is far more accurate this way.
- Always mention which document section to read.
- Ask for the report at the end; it makes review fast.
- Keep `AGENTS.md` updated when you learn a new rule; every session benefits.
- Do not merge anything you have not run yourself.