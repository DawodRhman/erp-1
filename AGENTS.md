# AGENTS.md — TRACK360 ERP

Instructions for AI coding agents (OpenAI Codex and others). Read this file fully before changing anything.

## 1. Project

TRACK360 ERP is ESSPL's unified ERP: Sales, Inventory & Purchasing, Field Service, Finance, Management. One login, one connected record chain, 1,000+ users.

Source of truth documents (read the relevant one before each task):

- `docs/01-PRD.md` — what to build, roles, modules, statuses, acceptance criteria
- `docs/02-DESIGN-SYSTEM.md` — colors, components, page templates, naming
- `docs/03-ARCHITECTURE.md` — modules, database, events, infrastructure, testing

If code and documents disagree, the documents win unless the task says otherwise. If documents are unclear or conflict with each other, stop and ask; do not guess.

## 2. Stack

- Frontend: React, TypeScript (strict), Vite, `packages/ui` components
- Backend: Node.js, Express, TypeScript (strict), PostgreSQL, Redis, BullMQ
- Validation: Zod schemas in `packages/shared`, used by both web and API
- Tests: Vitest (unit, integration), Playwright (end to end), k6 (load)
- Package manager: pnpm workspaces. Do not mix in npm or yarn lockfiles.

Existing code lives in `erp-1` (backend) and `erp-2` (frontend). Inspect the current code and follow its existing patterns first. Migrate to the target structure in small, safe steps. Never do a big-bang rewrite.

## 3. Commands

Confirm exact scripts in `package.json`; typical:

```
pnpm install
pnpm dev                 # web + api + worker via docker compose deps
pnpm lint
pnpm typecheck
pnpm test                # unit + integration
pnpm test:e2e            # Playwright
pnpm db:migrate
pnpm db:seed
pnpm build
```

Before finishing any task run: `pnpm lint && pnpm typecheck && pnpm test`. Fix all failures. Do not disable tests, lint rules, or type checks to get green.

## 4. Non-negotiable domain rules

Never weaken these. Every one needs a backend check and an automated test.

1. Quotation cannot be sent to the client before management approval. The approver cannot be the preparer.
2. Sales order is created only after client acceptance and only once (idempotent).
3. Inventory sees only released orders.
4. Materials cannot be issued before a passing Stock Check.
5. Shortage lines are not ready to fulfil until goods are received.
6. Field completion requires client sign-off.
7. Invoice requires completed Closeout and billing review. Zero final amount creates a Zero-Balance Closure, not an invoice.
8. Issued invoices and approved quotation versions are immutable snapshots. Correct via credit note or void.
9. Purchase cost and margin never appear in Sales-facing API responses. Enforce in the backend serializer.
10. Stock and ledger change exactly once per receipt, issue, or closeout, inside one transaction, with row locking.
11. Never fall back silently to zero price or zero payable. Fail with a clear error.
12. Every state change writes an audit event and, where defined, an outbox event in the same transaction.

## 5. Architecture rules

- Backend modules live in `apps/api/src/modules/<module>/`: `routes`, `service`, `repository`, `events`, `schema`, `permissions`, `tests`.
- A module never reads or writes another module's tables. Use its public service interface or events.
- One PostgreSQL schema per module. No cross-schema foreign keys or joins in application code.
- Every route declares its required permission. A CI test fails if a route has none.
- Record scope (own, team, branch, all) is applied in the data layer.
- Cross-module handoffs use outbox and inbox with idempotent consumers.
- Creates and irreversible actions require `Idempotency-Key`. Updates use version checks (`If-Match`) and return `409` on conflict.
- List endpoints: server-side filter, sort, cursor or capped pagination (max 200). No unbounded queries. Avoid N+1.
- Money is `numeric(18,4)`, never a float. Timestamps are UTC `timestamptz`.
- Dashboards read from read models, not live cross-module joins.
- Email, PDF, export, and projections run in workers, never in the request path.

## 6. Frontend rules

- Use design tokens from `packages/ui` (see design system section 3.4). No hard-coded hex values in components.
- Use the page templates: Dashboard, List, Form (status bar, smart links, chatter), Kanban, Report, Document.
- Every dashboard page shows its heading: **Sales Dashboard**, **Inventory Dashboard**, **Finance Dashboard**, **Executive Dashboard**, and **My Work** for Home.
- Use glossary terms only: Requirement, Quotation, Sales Order, Stock Check, Field Job, Issue Materials, Closeout, Billing Queue, Zero-Balance Closure. Never use "Portal", "Token", "Installer", "Super Admin" (in business screens), or "Client Request".
- Every page has loading (skeleton), empty, error, and success states.
- Long lists are server-paginated and virtualized. Filters and columns are persisted per user.
- Menu hiding is UX only; never rely on it for security.
- Responsive at desktop, tablet, phone. WCAG 2.1 AA: labels, focus ring, keyboard use, no color-only meaning.
- Print views have no app chrome.

## 7. Security rules

- Never commit secrets, tokens, or real customer data. Use `.env.example` with placeholders.
- Hash passwords with Argon2id. Throttle login. Use HttpOnly, Secure, SameSite cookies and CSRF protection.
- Validate all input with Zod at the boundary. Never return raw database errors.
- Parameterized queries only. No string-built SQL.
- Uploads: size and type limits, scan result required, signed URLs for download.
- Do not log secrets or personal data. Log with correlation ID.

## 8. Testing requirements

For each feature add tests at the right levels:

- Unit: calculations, tax, currency, state machines, permission rules, serializers.
- Integration: real Postgres and Redis containers; transactions, idempotency, outbox, stock concurrency.
- Contract: API schemas (OpenAPI) and event schemas.
- E2E: Playwright happy path and one blocked-gate path for the flow touched.
- Security: unauthorized access returns `403`; cost fields absent for Sales; expired or reused review link rejected.

Tests use unique suffixes and clean up only their own data. Never depend on test order.

## 9. Database rules

- Migrations are versioned, forward-only, reviewed. Use expand, migrate, contract for breaking changes.
- Add indexes for every new filter and join path. Include the migration and the reason.
- Large append-only tables (`audit.events`, `inventory.stock_movements`, notifications) are partitioned.
- Seeds create roles, permissions, and demo data only for local and staging.

## 10. Working style

1. Read the task, then the matching document section. State a short plan before coding.
2. Inspect existing code before creating new files. Reuse before adding.
3. Make small, reviewable changes: one concern per commit. Commit style: `feat(sales): ...`, `fix(inventory): ...`, `refactor(api): ...`, `docs: ...`, `test: ...`.
4. Do not add libraries without a reason stated in the change description. Prefer what is already in the repo.
5. Do not remove or rename existing public APIs or database columns without a migration path.
6. Do not leave TODO stubs, mock data, or commented-out code in finished work. If something is deliberately deferred, list it in the summary.
7. Keep comments for the why, not the what. Names must be clear and follow the glossary.
8. When finished, report: what changed, files touched, tests added and run (with results), risks, and anything not done.

## 11. Ask before

- Changing a domain rule in section 4.
- Changing role keys, permission keys, event names, or public API shapes.
- Dropping data or columns.
- Introducing a new infrastructure component.
- Any conflict between documents.

## 12. Definition of done

- Behavior matches the PRD acceptance criteria that apply.
- Backend authorization and record scope enforced and tested.
- Audit and outbox events written where defined.
- Lint, typecheck, unit, integration, and relevant e2e tests pass.
- UI matches the design system and works on phone and desktop.
- No cost leakage, no secrets, no raw errors.
- Docs updated if behavior, API, or events changed.