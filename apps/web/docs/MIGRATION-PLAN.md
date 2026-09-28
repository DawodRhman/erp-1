# TRACK360 ERP Migration Plan

**Phase:** 0 - Audit and plan  
**Status:** Complete for review  
**Audit date:** 2026-09-28  
**Code changes in this phase:** None

## 1. Source of truth

This audit uses the following v2 documents as the controlling specification:

1. TRACK360 ERP Product Requirements Document v2.0
2. TRACK360 Design System v2.0
3. TRACK360 ERP Target Architecture and Infrastructure v2.0
4. TRACK360 ERP AGENTS.md instructions
5. TRACK360 phased build instructions

Where the current implementation conflicts with those documents, the v2 documents win unless a question in section 8 is answered differently by management.

## 2. Executive findings

The current application is a working prototype with substantial CRM, inventory, field, finance, and EMS behavior. Its automated baseline is healthy, but it is not yet the v2 production architecture.

The highest-risk differences are:

1. The code is split into two Git repositories instead of the target monorepo.
2. All application tables are in `public`; target ownership requires one PostgreSQL schema per module.
3. Cross-module handoffs directly read and write other modules' tables; no durable outbox/inbox exists.
4. Quotation status can be moved to `SENT` by a general CRM writer without proving the previous state was management-approved.
5. The management approver is not prevented from being the quotation preparer.
6. Purchase receipt, stock issue, closeout, billing, and invoice operations do not use one consistent idempotency framework.
7. Finance currently permits issued invoices to be updated and deleted, contrary to the immutable-issued-document rule.
8. ERP permissions are broad module permissions such as `crm:write`, not action permissions such as `quotation.approve`.
9. Branch and record scope are not consistently enforced in ERP repositories.
10. Business terminology and screen structure still reflect the earlier prototype.

The migration must therefore be incremental. Existing behavior should remain available behind compatibility routes while each new module is completed and verified.

## 3. Current system

### 3.1 Repository layout

The workspace currently contains two independent repositories:

```text
erp-review/
  erp-1/                 Express backend and PostgreSQL migrations
  erp-2/                 React frontend, tests, documents, generated output
  TRACK360-React.code-workspace
```

The parent `erp-review` directory is not a Git repository. Both child repositories use the `main` branch and both currently contain uncommitted user and implementation work. Migration must preserve those changes and history.

### 3.2 Backend: `erp-1`

**Stack**

- Node.js ES modules, Express 5, PostgreSQL (`pg`)
- `node-pg-migrate` with SQL migrations
- JWT authentication, bcrypt password hashing
- Zod validation in selected routes
- Nodemailer for quotation email
- Vitest unit/service tests
- Multer-backed local product image upload

**Current size**

- 136 source files
- 35 backend test files
- 75 migrations
- 208 Express route declarations

**Current modules**

```text
src/modules/
  accounts/ announcements/ attendance/ audit/ auth/
  calendar-events/ config/ crm/ dashboard/ department-scope/
  directory/ employees/ finance/ inventory/ invoicing/
  leave/ matrix/ notifications/ penalties/
```

The ERP implementation is mainly concentrated in `crm`, `inventory`, `finance`, `invoicing`, and `matrix`. Inventory and field-service behavior share one module and directly update CRM and finance tables.

**API shape**

- APIs are mounted under `/api/*`, not the target `/api/v1/*`.
- Authentication is applied within route modules.
- Many ERP actions use broad permissions: `crm:read`, `crm:write`, `inventory:read`, `inventory:write`, `accounts:read`, `accounts:write`, and `matrix:*`.
- Error and success helpers exist, but the target `{ data, meta, error }` contract is not universal.
- Correlation/request IDs exist and are returned as `x-request-id`.

**Database shape**

All current tables are in `public`. Important ERP tables include:

```text
customers, crm_leads, quotations, quotation_items, crm_orders,
products, item_categories, inventory_items, inventory_movements,
vendors, purchase_orders, purchase_order_items,
installer_field_dispatches, installer_dispatch_items,
installer_on_the_go_purchases, field_material_requests,
customer_invoices, customer_invoice_items,
customer_invoice_summaries, invoice_adjustment_audit,
roles, permissions, role_permissions, users, activity_logs
```

There are also overlapping legacy tables (`sales_quotations`, `sales_leads`, `invoices`, `invoice_items`) and extensive EMS tables. Several services inspect table columns at runtime and alter compatibility behavior based on what exists. That supports the prototype but makes contracts and deployments harder to reason about.

**Roles found in current code and seeds**

- Target ERP keys already present: `csr_officer`, `inventory_officer`, `finance_officer`, `super_admin`
- Additional ERP role: `inv_fin_admin`
- Legacy installer references remain in tables and APIs, although installer is not a target workspace
- EMS roles also remain: HR, branch, department, employee, and CEO variants

### 3.3 Frontend: `erp-2`

**Stack**

- React 18, TypeScript, Vite
- React Router 6
- Axios, TanStack Query, Zustand
- Radix UI primitives and local UI components
- Recharts and QR rendering
- Vitest and Testing Library; Playwright is installed but no complete four-role journey is wired into CI

**Current size**

- 268 source files
- 49 frontend test files
- 121 page TSX files
- 137 route elements in `src/App.tsx`
- 55 TSX/CSS files contain hard-coded hex colors

**Current application structure**

- One login and a role-aware root redirect already exist.
- Sales is exposed as `/crm/*`.
- Inventory is split across `/inventory-dashboard`, `/inventory/*`, and `/matrix-operations`.
- Finance is split across `/finance-dashboard`, `/finance/*`, `/client-invoicing`, and `/invoice-builder`.
- Management is exposed as `/admin/*`.
- EMS and employee self-service routes share the same application shell.
- The sidebar is role-specific, but the target workspace switcher, command palette, activities, branch selector, saved views, and standard record form template do not yet exist as shared production components.

### 3.4 Baseline verification

The baseline was run before creating this document:

| Check | Result |
|---|---|
| Backend tests | 36 files, 177 tests passed |
| Frontend tests | 49 files, 154 tests passed |
| Frontend production build | Passed |
| Frontend lint | Passed with 64 warnings and 0 errors |

Warnings are mainly React hook dependency and fast-refresh warnings. They are not blocking today, but the target CI should fail on newly introduced warnings and burn down the existing warning set intentionally.

## 4. PRD gap matrix

Legend:

- **Exists:** usable implementation is present, though it will still move into the target structure.
- **Partial:** meaningful behavior exists but the PRD contract, security, data model, or standard page template is incomplete.
- **Missing:** no equivalent production feature exists.
- **Wrong name:** behavior exists under terminology forbidden by the v2 glossary.

| Workspace / module | Required page or capability | Current status | Current implementation and gap |
|---|---|---:|---|
| Home | My Work | Partial | EMS dashboards and pending actions exist, but there is no unified ERP activity queue across records. |
| Home | Notifications | Partial | Notification module exists; target real-time rules, preferences, and cross-module events are incomplete. |
| Home | Global search | Partial | Top-bar search UI exists, but not the permission-filtered Ctrl+K record index in the PRD. |
| Sales | Sales Dashboard | Partial / Wrong name | `/crm` dashboard exists; menu and copy still use CRM/CSR language and do not expose the full next-action queue. |
| Sales | Clients | Partial | List, add, edit, service categories, and immediate lookup exist; duplicate policy, multiple contacts/sites, archive, branch, owner, commercial defaults, and smart links are incomplete. |
| Sales | Requirements | Missing / Wrong name | `crm_leads` and Sales Leads exist instead of the required Requirement record and status model. |
| Sales | Quotations | Partial | Create, edit, tax, client link, email, and approval statuses exist; version snapshots, complete currency controls, approval state machine, expiry job, and shared document template are incomplete. |
| Sales | Sales Orders | Partial / Wrong name | `crm_orders` and Orders Tracker exist; explicit release action, full fulfilment trail, status model, and smart links are incomplete. |
| Management | Approvals | Missing | Management status fields exist, but there is no dedicated rule-driven approval module, queue, delegation, escalation, or multi-level rules. |
| Inventory | Inventory Dashboard | Partial | KPIs, charts, live inventory SSE, and work queues exist; target read model and complete KPI definitions are not implemented. |
| Inventory | Products | Partial | List, create/edit/detail, SKU generation, image upload, tracking type, pricing, stock history, and custom product fields exist; branch/location model, preferred vendor/reorder rule, imports, and restricted cost repository are incomplete. |
| Inventory | Stock | Partial | Product balances, serial items, and movements exist; reserved vs available balances, batches, stock adjustments, and transfer flow are incomplete. |
| Inventory | Stock Checks | Partial / Wrong name | Inventory token generation performs a stock check, but UI/API/domain names use Token and `TKN-*` instead of Stock Check and `CHK-*`. |
| Inventory | Movements | Exists / Partial | Movement ledger exists; target partitioning, branch filters, immutable event contract, and complete reason model are pending. |
| Inventory | Locations | Partial | Warehouse, room, and rack fields exist on product/receipt records; there is no dedicated managed Locations page or normalized location ownership. |
| Purchasing | Vendors | Partial | Vendor CRUD exists inside inventory configuration; dedicated page, audit, categories, contacts, terms, currency, active/archive state are incomplete. |
| Purchasing | Purchase Orders | Partial | PO generation, vendor, expected date, custom attributes, and status exist; amount approvals, target statuses, currency/rate, separate terms, and dedicated full page are incomplete. |
| Purchasing | Receipts | Partial | PO receiving updates stock and ledger in a transaction; a dedicated receipt record/evidence page and universal idempotency are missing. |
| Field Service | Field Jobs | Partial / Wrong name | Dispatch/Field Operations exists with technician assignment, materials, QR data, and completion; tables and several APIs still use installer/dispatch terminology. |
| Field Service | Closeouts | Partial / Wrong name | Material Reconciliation and Returns implement used/returned quantities, sign-off, condition, bill adjustment, and stock return; immutable closeout/correction flow and target name are incomplete. |
| Field Service | Teams | Missing | Users can be selected as technicians, but there is no team, availability, calendar, or resource management page. |
| Finance | Finance Dashboard | Partial | Dashboard and period filtering exist; target read model, complete receivable metrics, branch/service/currency analysis are incomplete. |
| Finance | Billing Queue | Partial / Wrong name | Billing Approvals receives closeout bills; terminology, return-for-correction workflow, evidence view, and state model need alignment. |
| Finance | Invoices | Partial | Dedicated list/detail/print/PDF and editable values exist; issued invoices are still editable/deletable and immutable snapshots/credit-note policy are not enforced. |
| Finance | Payments | Missing | No target payment receipt/allocation page or `PAY` chain record exists. |
| Finance | Receivables | Missing | No ageing buckets, per-client balance workflow, or reminders page exists. |
| Finance | Reports | Partial / Wrong name | Summaries exist; target period/client/service/branch/currency/status filters and Excel/CSV exports are incomplete. |
| Management | Executive Dashboard | Partial / Wrong name | Admin dashboard exists; target name, read model, approvals, margin exceptions, commitments, field exceptions, and branch comparison are incomplete. |
| Management | Users & Roles | Partial | User status and role grouping exist; custom permission matrix, branch assignments, forced password controls, and sessions need completion. |
| Management | Branches | Missing | EMS has location concepts, but the target ERP branch master and record scope are not implemented. |
| Management | Audit Log | Partial | Activity logs and filters exist; event coverage is incomplete and storage is not append-only/partitioned/tamper-evident. |
| Management | Settings | Partial | Company, inventory, categories, custom product fields, and templates exist in several screens; target consolidated settings modules are incomplete. |
| Management | System Health | Missing | DB health endpoint exists; queue, worker, email, backup, and error health UI does not. |
| Platform | Status bar and record trail | Partial | Some workflow indicators exist; there is no shared status bar or full REQ-to-PAY record trail. |
| Platform | Chatter and activities | Missing / Partial | Activity logs exist, but record chatter, mentions, followers, due-date activities, and My Work integration are missing. |
| Platform | Saved filters and views | Missing | No shared saved list/kanban/calendar/pivot view framework. |
| Platform | Import/export | Partial | EMS imports and some reports exist; PRD client/product validation preview and permission-safe export are incomplete. |
| Platform | Custom fields | Partial | Product custom fields exist; Client, Quotation, PO, and Receipt targets are missing. |
| Platform | Number sequences | Partial | Database sequences generate current numbers; branch/year configurable sequence management is missing. |
| Platform | Attachments | Partial | Employee/local uploads exist; object storage, pre-signed uploads, scan state, and permission-checked downloads are missing. |
| Platform | Multi-branch/currency | Partial | Some currency and EMS location fields exist; authorized rate history and ERP branch scope are incomplete. |
| Platform | Idempotency | Partial | Quotation/order/direct invoice paths have selected duplicate protection; there is no shared header-backed idempotency store for all irreversible actions. |

## 5. Terminology violations

Framework terms such as React `createPortal` and authentication tokens are not business-language violations. The following are business-facing or domain-model violations that must be migrated with compatibility aliases where required.

| Current term | Required term | Representative frontend paths | Backend / database paths |
|---|---|---|---|
| CRM / CSR | Sales | `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/pages/CRM.tsx`, `src/pages/crm/Dashboard.tsx`, `src/pages/Launchpad.tsx`, `src/pages/MatrixOperations.tsx`, `src/utils/rolePortalMeta.ts` | `../erp-1/src/modules/crm/*`, `../erp-1/migrations/1782110021026_crm_orders_and_clean_quotation_flow.sql` |
| Portal | Workspace or module | `src/components/layout/Sidebar.tsx`, `src/pages/Accounts.tsx`, `src/pages/admin/AdminPages.tsx`, `src/pages/Login.tsx`, `src/utils/rolePortalMeta.ts` | Role descriptions and legacy documentation/seeds in `../erp-1/scripts` and `../erp-1/seeds` |
| Token / Fulfilment Token | Stock Check | `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/pages/InventoryTokens.tsx`, `src/pages/FlowPages.tsx`, `src/pages/InventoryDashboard.tsx`, `src/services/inventoryService.ts` | `../erp-1/src/modules/inventory/inventory.routes.js`, `../erp-1/src/modules/inventory/inventory.service.js`, `crm_orders.token_number`, `inventory_token_number_seq` |
| Installer / Dispatch | Technician or team / Field Job | `src/App.tsx`, `src/pages/FlowPages.tsx`, `src/pages/InstallerReturns.tsx`, `src/pages/FieldReconciliation.tsx`, `src/pages/InventoryDashboard.tsx`, `src/services/inventoryService.ts` | `installer_field_dispatches`, `installer_dispatch_items`, `installer_on_the_go_purchases`, `../erp-1/src/modules/inventory/field-logistics.service.js` |
| Installer Returns / Material Reconciliation | Closeout | `src/components/layout/Sidebar.tsx`, `src/pages/FieldReconciliation.tsx`, `src/pages/FlowPages.tsx` | `/api/inventory/returns/*`, reconciliation methods in `field-logistics.service.js` |
| Billing Approvals / Send Bill | Billing Queue / Send to Billing Queue | `src/components/layout/Sidebar.tsx`, `src/pages/finance/FinancePages.tsx`, `src/services/inventoryService.ts` | `/api/finance/billing-approvals`, `/api/inventory/returns/:id/send-bill` |
| No Charge | Zero-Balance Closure | `src/pages/finance/FinancePages.tsx` | `NO_CHARGE` statuses in finance and field logistics services and migrations |
| Super Admin (business screen) | Senior Management | `src/components/layout/Topbar.tsx`, `src/pages/admin/AdminPages.tsx`, `src/pages/AuditLog.tsx`, `src/utils/rolePortalMeta.ts` | User-facing errors and descriptions in auth/audit/scripts; the technical role key `super_admin` remains unchanged |
| Admin Dashboard | Executive Dashboard | `src/components/layout/Sidebar.tsx`, `src/pages/admin/AdminPages.tsx` | Current dashboard API/read model is not management-specific |
| Sales Leads | Requirements | `src/components/layout/Sidebar.tsx`, `src/pages/CRM.tsx`, CRM page routes | `crm_leads`, matrix lead APIs, lead service methods |
| Orders Tracker | Sales Orders | `src/components/layout/Sidebar.tsx`, `src/pages/crm/OrdersTracker.tsx` | `crm_orders` route naming and status model |

No exact `Client Request` user-facing string was found in the current TypeScript source, but the required Requirement entity is still missing and is currently represented by Leads.

## 6. Domain and architecture risks

| Priority | Risk | Evidence | Required resolution |
|---|---|---|---|
| Critical | Client send can bypass management approval | `crm.controller.js` restricts only setting `MANAGEMENT_APPROVED`; `crm.service.js` permits `SENT` as a direct next status without checking the current status. | Introduce a quotation state machine. `Send to Client` must require the approved immutable version. Test direct and skipped transitions as `409`. |
| Critical | Approver may equal preparer | Management approval records an actor but does not compare it with `created_by`. | Reject self-approval in the backend and cover it with integration and E2E tests. |
| Critical | Issued invoices are mutable and deletable | `finance.routes.js` exposes PUT and DELETE; finance service rewrites line items and totals for existing invoices. | Draft edits require a reason and audit. Issued invoices become immutable snapshots; correction uses void or Phase 2 credit note. |
| Critical | No universal stock idempotency | Receipt and issue use transactions and row locks, but do not use a shared `Idempotency-Key` record. A retried receipt payload can be applied again if still within ordered quantity. | Add the platform idempotency repository and require it for receipt, issue, closeout, billing approval, invoice issue, and payment. |
| Critical | Cross-module writes are synchronous and coupled | CRM, inventory, field logistics, and finance services read/write each other's `public` tables directly. | Introduce module-owned schemas, public service contracts, and transactional outbox/inbox handoffs. Keep compatibility projections during migration. |
| High | Billing approval is not one transaction | Finance approval updates invoice then updates CRM order using separate pool queries. | One owner transaction plus outbox event; idempotent consumer updates the Sales projection. |
| High | Cost isolation is endpoint-specific | CRM product controller removes `cost_price` and `purchase_price`, but there is no centralized permission-aware serializer or contract test for every Sales response. | Move costs to `inventory.cost_history`, add `cost.view`, serializer policy, and a build-blocking cost-leak contract test. |
| High | Status transitions are not centrally guarded | Services accept status strings and use different status vocabularies. Optimistic `version` checks are not standard. | Shared status constants and transition policies in `packages/shared`; `If-Match` and `409` on conflicts. |
| High | Audit coverage is partial | Activity logs are written for selected actions; not every transition writes previous/new status and no outbox event is guaranteed in the same transaction. | Append-only `audit.events`, transition helper, and outbox write in the owner transaction. |
| High | ERP record scope is missing | Permission middleware checks role permissions, but ERP list repositories do not consistently apply own/team/branch/all filters. | Introduce branch membership and repository-level scope helpers; test cross-branch access denial. |
| High | Permission model is too broad | General `crm:write` can create, edit, approve-related state changes, convert, and send; `inventory:write` covers receipt, issue, reconcile, and billing handoff. | Migrate to action permissions and require every route to declare one. Add permission-coverage CI test. |
| High | Public review links lack the full target lifecycle | Links use a token and row lock, but expiration, signed purpose, explicit revision action, rate limits, and version binding are incomplete. | Store hashed, expiring, single-purpose review grants bound to quotation version; reject reused/expired links and add revision. |
| High | One `public` schema owns all data | All ERP and EMS tables share `public`, with direct foreign keys and duplicated legacy tables. | Expand into `identity`, `sales`, `inventory`, `purchasing`, `field`, `finance`, `audit`, and `platform`; backfill and dual-read before contract cleanup. |
| Medium | Realtime is process-local | Inventory SSE uses application events; there is no Redis fan-out or durable source. | Publish from outbox through Redis and rebuild read models; SSE is delivery only, not source of truth. |
| Medium | Lists are often unbounded or capped ad hoc | Several endpoints return all rows; product selectors request 500 records; finance client list uses fixed 250. | Standard cursor pagination, max 200, indexed filters, async searchable selectors. |
| Medium | Uploads are local and public by filename | Product image endpoint serves local uploads without target object-storage metadata and scan state. | Pre-signed object uploads, allowlisted type/size, scan result, permission-checked signed download, async resize. |
| Medium | CORS configuration is permissive | `ALLOWED_ORIGINS` is read but CORS uses `origin: true`. | Enforce configured origins in production and add CORS/security integration tests. |
| Medium | Authentication is below target standard | Bearer tokens and cookie fallback exist; no rotating server-stored refresh session, CSRF contract, throttling/lockout, or permission version in the token. | Implement the Phase 3 identity/session design before exposing production traffic. |
| Medium | Runtime schema mutation exists in services | Services execute compatibility `ALTER TABLE`/`CREATE SEQUENCE` operations at runtime. | Move all DDL into forward-only migrations; application processes receive DML-only DB credentials. |

### Existing controls worth preserving

The migration should retain and strengthen these working controls:

- Quotation-to-order duplicate handling and a unique quotation/order relationship
- Transactions around quotation save, stock issue, purchase receipt, and closeout
- Row locking on selected quotation, order, stock, serial, and closeout records
- Client sign-off requirement during field completion
- Zero-value invoice blocking
- Sales product response currently strips purchase/cost fields
- Stock updates and movement ledger writes occur together in several inventory paths
- One-login role redirect and frontend role route guards
- Quotation email failure does not discard the quotation

## 7. Step-by-step migration plan

Every step below is intended to be a small, reviewable pull request. Do not begin the next phase until the current phase acceptance criteria pass and the user reviews the visible result.

### Phase 0 - Audit and decision lock

- **PR 0.1:** Add this migration plan and record the baseline.
- **PR 0.2:** Resolve the questions in section 8 and write ADRs for the answers.
- **Exit gate:** Approved migration plan; no application behavior changed.

### Phase 1 - Repository foundation

- **PR 1.1:** Create the `track360` root repository, canonical `docs/01-PRD.md`, `docs/02-DESIGN-SYSTEM.md`, `docs/03-ARCHITECTURE.md`, root `AGENTS.md`, pnpm workspace, and shared config package.
- **PR 1.2:** Move `erp-2` to `apps/web` with Git history preserved; retain its current start/build/test behavior.
- **PR 1.3:** Move `erp-1` to `apps/api` with Git history preserved; retain its current start/migrate/test behavior.
- **PR 1.4:** Add `apps/worker`, `packages/shared`, `packages/ui`, and `packages/config` skeletons without business behavior.
- **PR 1.5:** Add local Docker Compose for PostgreSQL, Redis, MinIO, and MailHog plus root scripts.
- **PR 1.6:** Add CI for install, lint, typecheck, unit/integration tests, and builds; document compatibility commands.
- **Exit gate:** Fresh clone plus `pnpm install` and `pnpm dev` starts current behavior; CI is green.

### Phase 2 - Design system and application shell

- **PR 2.1:** Implement exact Harbor Navy tokens in `packages/ui`; remove new hard-coded component colors.
- **PR 2.2:** Implement accessible primitives: buttons, badges, inputs, async select, money/date controls, feedback, dialogs, drawers, and skeletons.
- **PR 2.3:** Implement DataTable, saved-view shell, status bar, smart links, KPI cards, command palette, and chatter shell.
- **PR 2.4:** Implement Dashboard, List, Form, Kanban, Report, and Printable Document templates.
- **PR 2.5:** Replace the current shell with one login, role-aware workspace navigation, breadcrumb, search, notifications, activities, branch selector, and responsive drawer.
- **PR 2.6:** Add compatibility route redirects, visual regression snapshots, keyboard tests, and desktop/tablet/mobile checks.
- **Exit gate:** Shared shell and templates match the design system; no business workflow is migrated yet.

### Phase 3 - Identity, RBAC, branches, and audit

- **PR 3.1:** Define stable permission keys, scope types, status constants, and role bundles in `packages/shared`.
- **PR 3.2:** Add identity and branch schemas with expand-only migrations and backfill current users/roles.
- **PR 3.3:** Add secure sessions, throttling, lockout, CSRF, refresh rotation, permission version, and first-login enforcement.
- **PR 3.4:** Add declarative permission metadata to every route and a CI permission-coverage test.
- **PR 3.5:** Add repository-level record-scope filters and field serializers, including `cost.view`.
- **PR 3.6:** Add append-only audit transitions and the Management Users, Roles, Branches, and Audit pages.
- **Exit gate:** Four target roles land in the correct workspace; unauthorized API calls return `403`; branch and cost isolation tests pass.

### Phase 4 - Platform services

- **PR 4.1:** Add platform idempotency, number sequence, outbox, and inbox tables/repositories.
- **PR 4.2:** Add worker relay, retry/dead-letter handling, event contracts, and replay tooling.
- **PR 4.3:** Add notification/email jobs and templates; keep provider failure non-blocking.
- **PR 4.4:** Add attachment metadata, object-storage flow, scan state, and signed downloads.
- **PR 4.5:** Add activities, chatter, mentions, smart links, record trail, and search-index projections.
- **Exit gate:** Duplicate commands/events are harmless; failed async work is visible and replayable.

### Phase 5 - Infrastructure and observability

- **PR 5.1:** Production Dockerfiles, readiness/liveness/startup checks, graceful shutdown, and secrets contract.
- **PR 5.2:** Structured logs, OpenTelemetry, Prometheus metrics, Grafana dashboards, and safe System Health API.
- **PR 5.3:** Backup/PITR and restore runbook; staging deployment and rollback procedure.
- **PR 5.4:** k6 baseline for mixed 300-user load and stock concurrency.
- **Exit gate:** Staging deploy, health checks, alerts, backup restore, and baseline load test are documented and repeatable.

### Phase 6 - Business modules, one module at a time

Use the same order for every module: schema/migration -> repository/domain service -> API contract -> UI -> migration adapter/backfill -> tests -> browser verification -> user review.

#### 6A Sales

- Clients, contacts, sites, commercial defaults, tags, duplicate checks, archive, smart links
- Requirements replacing Leads
- Versioned quotations, currency/tax math, shared print template, expiry
- Secure client review grants and released Sales Orders
- Sales Dashboard and full record trail

#### 6B Management Approvals

- Configurable rules, levels, separation of duties, return/reject reasons, delegation, reminders, escalation
- Management approval queue and immutable approval snapshot

#### 6C Inventory

- Products, tracking types, stock balances, reservations, serial/batch, locations, reorder rules
- Stock Checks replacing Tokens; atomic reserve and shortage events
- Inventory Dashboard read model and low-stock projection

#### 6D Purchasing

- Vendors, Purchase Orders, approval, partial receipts, evidence, cost history
- Exactly-once stock/ledger update and shortage-clear projection

#### 6E Field Service

- Teams and technicians, Field Jobs, Issue Materials, custody, completion, client sign-off
- Closeout conditions, eligible returns, extras, immutable billing submission and authorized correction

#### 6F Finance

- Billing Queue, draft invoice editing with reason, immutable issue snapshot, PDF
- Zero-Balance Closure, Payments, allocation, Receivables ageing, reports
- Phase 2 follow-up for credit notes if not included in the initial core release

#### 6G Management

- Executive Dashboard read model, full settings, System Health, cross-module exception queues

- **Exit gate for each module:** Applicable PRD acceptance criteria pass, API and event contracts are documented, desktop/phone UI is verified, and the user approves before the next module starts.

### Phase 7 - Reporting, search, and performance

- **PR 7.1:** Permission-filtered global search and indexed search projection.
- **PR 7.2:** Inventory, finance, executive, client 360, and record-trail read models.
- **PR 7.3:** Background Excel/CSV exports and report download lifecycle.
- **PR 7.4:** Query-plan tests, cursor pagination, partitioning, cache policy, and 300/500-user k6 runs.
- **Exit gate:** PRD latency and load targets pass with no permission or cost leakage.

### Phase 8 - Hardening and release

- **PR 8.1:** Security review: auth, CSRF, CORS, uploads, secrets, dependencies, SBOM, audit tamper checks.
- **PR 8.2:** Full four-role E2E journey from REQ to PAY plus blocked-gate journeys.
- **PR 8.3:** Production data backfill, reconciliation reports, dual-read comparison, and cutover rehearsal.
- **PR 8.4:** Restore drill, rollback drill, release checklist, operator runbooks, and signed release candidate.
- **Exit gate:** All PRD acceptance criteria and Definition of Done checks pass; management approves production cutover.

### Target repository

The completed migration ends at:

```text
track360/
  AGENTS.md
  docs/
  apps/
    web/
    api/
    worker/
  packages/
    shared/
    ui/
    config/
  infra/
    docker/
    deploy/
    observability/
    k6/
  db/
    migrations/
    seeds/
```

## 8. Decisions required before the affected phase

These are limited to issues where the current code and target documents do not fully determine the answer.

1. **EMS ownership:** Should the existing EMS remain inside the same `track360` web/API deployment as an additional workspace, or move to a separate app that shares Identity and Access?
2. **Dual-access role:** Should `inv_fin_admin` remain as a custom permission bundle, or be retired so only the four default ERP role keys remain?
3. **Technician access:** For the first production release, are technicians resources only, or should limited technician login be included early instead of Phase 2?
4. **Direct invoices:** May Finance create an invoice without a Sales Order, Field Job, Closeout, and Billing Queue record, or must all customer invoices follow the controlled chain?
5. **Approvals:** What quotation amount, margin, discount, currency, client-type, and branch thresholds require each approval level?
6. **Branches and numbering:** What is the initial branch list, and should document sequences reset by branch and year?
7. **Legacy data:** Which legacy CRM, matrix, installer, and duplicate invoice tables must remain searchable after cutover, and for how long?
8. **Hosting:** Will the first production target be company infrastructure or a managed cloud platform?
9. **Document templates:** Should HBL-specific quotation/invoice layouts remain as selectable client templates while the default template becomes client-neutral?

## 9. Phase 0 exit checklist

- [x] Current frontend and backend structure recorded
- [x] Modules, routes, roles, and important tables recorded
- [x] PRD page/capability gap matrix completed
- [x] Terminology violations mapped to paths
- [x] Release-gate, cost, idempotency, transaction, scope, and architecture risks documented
- [x] Small-step migration plan ends at the target monorepo
- [x] Baseline tests, build, and lint run
- [ ] Management answers the decisions required for Phase 1 and the affected later phases
- [ ] User approves Phase 0 and explicitly starts Phase 1
