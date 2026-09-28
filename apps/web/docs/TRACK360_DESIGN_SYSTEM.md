# TRACK360 ERP Design System

**System name:** TRACK360 Design Language  
**Version:** 1.0  
**Purpose:** A consistent, professional, accessible interface for one unified ERP platform

## 1. Experience Principles

1. **One platform:** Every user enters through the same login and application shell.
2. **Role focus:** Show the user the work, records, and decisions relevant to the assigned role.
3. **Operational clarity:** The next required action must be visible without explanatory clutter.
4. **Controlled progression:** Approval gates, blocked states, and handoffs are explicit.
5. **Business language:** Use professional operational terms, not implementation labels.
6. **Traceability:** Display source references and status history where users make material decisions.
7. **Responsive by default:** Core work remains usable on desktop, laptop, tablet, and mobile.

## 2. Product Naming

- Primary product name: **TRACK360 ERP**
- Company endorsement: **Electronic Safety & Security (Pvt.) Ltd.**
- Login heading: **ESSPL Operations Platform**
- Login supporting line: **Sign in to your assigned TRACK360 workspace**
- Do not label authenticated areas as separate portals.

## 3. Workspace Names

| Role | Workspace label | Accent |
|---|---|---|
| CRM Officer | Client & Commercial | Blue |
| Inventory Officer | Inventory & Fulfilment | Teal |
| Finance Officer | Finance & Receivables | Amber |
| Senior Management | Management & Governance | Navy |

Accent colors identify context; they do not replace status colors or permission checks.

## 4. Design Tokens

### 4.1 Color

| Token | Value | Usage |
|---|---:|---|
| `--color-navy-900` | `#10234D` | Management, primary headings, application anchor |
| `--color-blue-700` | `#1D4ED8` | Primary actions and CRM accent |
| `--color-blue-600` | `#2563EB` | Links, focus, selected navigation |
| `--color-teal-700` | `#0F766E` | Inventory accent and verified operational state |
| `--color-amber-600` | `#D97706` | Finance accent and attention states |
| `--color-green-700` | `#047857` | Approved, complete, received, paid |
| `--color-red-700` | `#B91C1C` | Rejected, failed, overdue, destructive action |
| `--color-slate-950` | `#0F172A` | Primary text |
| `--color-slate-700` | `#334155` | Secondary strong text |
| `--color-slate-500` | `#64748B` | Supporting text |
| `--color-slate-300` | `#CBD5E1` | Borders and disabled controls |
| `--color-slate-100` | `#F1F5F9` | Secondary surfaces |
| `--color-page` | `#EEF5FF` | Application background |
| `--color-surface` | `#FFFFFF` | Forms, tables, dialogs, documents |

Rules:

- Do not use gradients as the only way to communicate state.
- Red is reserved for failure, rejection, overdue, or destructive actions.
- Green indicates confirmed success, not a general primary button.
- Primary commands use blue across all workspaces.
- Maintain WCAG AA contrast for normal text and controls.

### 4.2 Typography

Use one sans-serif family for the application and one optional serif family for formal printed documents.

- Application: `Inter`, with `Arial` and `sans-serif` fallbacks.
- Codes and identifiers: `IBM Plex Mono`, with `Consolas` and `monospace` fallbacks.
- Formal invoice/quotation body when required by the approved template: `Georgia`, with `Times New Roman` fallback.

| Style | Size / line height | Weight | Usage |
|---|---|---|---|
| Page title | 30 / 38 px | 700 | Primary page heading |
| Section title | 20 / 28 px | 700 | Major section |
| Card title | 16 / 24 px | 700 | Table or panel title |
| Body | 14 / 21 px | 400 | Default content |
| Label | 12 / 18 px | 600 | Form labels and table headers |
| Caption | 11 / 16 px | 500 | Metadata and supporting text |
| Identifier | 12 / 18 px | 600 mono | QT, ORD, TKN, PO, FSA, REC, INV |

Do not use negative letter spacing. Avoid oversized dashboard headings that reduce usable workspace.

### 4.3 Spacing and sizing

Base unit: `4px`.

- Compact: 4, 8, 12 px
- Standard: 16, 20, 24 px
- Section: 32, 40, 48 px
- Control height: 40 px desktop, minimum 44 px touch
- Sidebar width: 248 px expanded, 72 px collapsed
- Content maximum: 1600 px, with responsive page padding
- Border radius: 6 px controls, 8 px cards/dialogs; avoid decorative oversized rounding

### 4.4 Elevation

- Level 0: page background
- Level 1: bordered surface, no shadow
- Level 2: dropdown or sticky toolbar, subtle shadow
- Level 3: modal/drawer, focused shadow and overlay

Use shadows sparingly. Tables and major page sections should be bordered surfaces, not floating nested cards.

## 5. Application Shell

### Unified login

- centered or balanced single sign-in panel;
- light-blue application background with strong field contrast;
- ESSPL logo displayed clearly without distortion;
- one primary `Sign In` button in blue;
- no portal picker;
- concise inline validation;
- role is resolved after authentication.

### Top bar

Contains:

- current workspace and page breadcrumb;
- permitted global search;
- role badge;
- date/time when operationally useful;
- notifications;
- account menu and sign out.

Do not display employee search to users without employee-directory permission.

### Sidebar

- grouped by authorized responsibility;
- one selected state with blue bar and light-blue fill;
- role-specific menus only;
- collapsible on desktop and drawer-based on tablet/mobile;
- no disabled menus for unrelated departments;
- no separate Installer section.

## 6. Page Composition

Recommended order:

1. breadcrumb and page identity;
2. compact page header with title, purpose, and primary action;
3. workflow or status summary when relevant;
4. filters and search;
5. operational table/form/content;
6. totals, audit history, or supporting details.

Page headers must state the business purpose, not the implementation step number. Use `Pending Management Approval`, not `CRM Step 2`.

## 7. Components

### 7.1 Buttons

| Variant | Use |
|---|---|
| Primary | One main page action: Save, Submit, Approve, Issue Invoice |
| Secondary | Navigation or non-primary action: Preview, Refresh, Back |
| Tertiary | Low-emphasis contextual action |
| Destructive | Delete, Reject, Void, Cancel record |
| Icon-only | Standard actions with tooltip and accessible label |

Rules:

- Use verb + object: `Approve Quotation`, `Receive Materials`, `Issue Invoice`.
- Avoid vague `Done`, `Proceed`, or `Submit` without context.
- Disabled controls must explain the unmet prerequisite nearby.
- Loading actions keep their width and show progress without layout shift.

### 7.2 Status badges

| State family | Color | Examples |
|---|---|---|
| Neutral | Slate | Draft, Planned, Not Started |
| Information | Blue | Sent to Client, Tokenized, Issued |
| Attention | Amber | Pending Approval, Awaiting Stock, Reconciliation Pending |
| Success | Green | Approved, Received, Reconciled, Paid |
| Exception | Red | Rejected, Failed, Overdue, Lost |
| Governance | Navy | Management Review, Locked, Voided |

Status text uses title case in the interface and stable uppercase values only in APIs or databases.

### 7.3 Forms

- labels always remain visible;
- required fields use `*` and accessible required state;
- help text explains business rules, not obvious interaction;
- errors appear under the affected field and in a summary when submission fails;
- use searchable selectors for clients, products, vendors, and field resources;
- conditionally show organization fields for organization clients;
- group currency, exchange rate, and tax controls together;
- preserve entered values after recoverable errors;
- protect unsaved changes during navigation.

### 7.4 Tables

- sticky header for long lists;
- server-side pagination for operational datasets;
- explicit empty state and active filters;
- sortable columns only when sorting is supported;
- identifiers remain visible and use monospace;
- row actions appear at the right and do not overflow on smaller screens;
- mobile view converts records to a compact stacked layout, not a horizontally clipped table.

### 7.5 Dialogs and drawers

- dialogs for focused confirmation or short edits;
- right-side drawers for record preview and contextual activity;
- full page for complex quotation, purchase order, reconciliation, or invoice work;
- never place a complete invoice and an editable billing form on the same crowded page.

### 7.6 Notifications

- success toast: confirmed saved state;
- warning banner: unmet prerequisite or recoverable exception;
- error panel: failed action with a clear recovery step;
- persistent delivery notice for email status;
- avoid raw server configuration messages in user-facing UI.

## 8. Dashboard Pattern

Every role dashboard contains:

- 4 to 8 priority KPIs;
- work queue with the next required action;
- exception/attention list;
- period filter where values are time-dependent;
- links into authorized detail pages.

### CRM dashboard

New requirements, client additions, draft quotations, approval queue, client decisions, and order release.

### Inventory dashboard

Incoming orders, stock decisions, shortages, procurement, expected receipts, fulfilment readiness, active field service, and reconciliation.

### Finance dashboard

Billing review, invoices ready, issued value, receivables, overdue balances, sales tax, and monthly summaries.

### Management dashboard

Approval queue, commercial exceptions, stock and procurement risk, field exceptions, Finance actions, revenue, receivables, users, logs, and controls.

Dashboards may paginate or use tabs/carousels when content exceeds one viewport. Do not create an excessively long single dashboard.

## 9. Workflow Language

Use these action labels:

| Workflow | Preferred labels |
|---|---|
| Requirement | Record Requirement, Qualify Requirement |
| Quotation | Save Draft, Submit for Management Approval, Return for Revision, Approve for Client Review |
| Client decision | Send to Client, Copy Secure Review Link, Client Accepted, Revision Requested |
| Order | Release Sales Order |
| Inventory | Generate Fulfilment Token, Check Stock, Create Purchase Order, Receive Materials |
| Field operations | Prepare Field Service, Issue Materials, Start Field Service, Record Completion, Capture Client Sign-off |
| Reconciliation | Review Material Outcome, Confirm Reconciliation, Submit Verified Billing Record |
| Finance | Review Billing Record, Return for Correction, Approve Billing, Generate Invoice, Issue Invoice |

## 10. Formal Documents

Quotation and invoice share:

- ESSPL identity;
- client/company block;
- branch/service site;
- document number and date;
- item/service table;
- currency and exchange rate;
- tax method and totals;
- commercial terms;
- authorized signatory area.

Quotation-specific content: validity, delivery/mobilization, warranty/service terms, and management approval.

Invoice-specific content: source order/assignment, payment reference, Finance authorization, payment status, and receivable balance.

Print rules:

- dedicated printable route or document-only surface;
- A4-safe dimensions;
- no browser navigation, URL, action buttons, or decorative application chrome;
- controlled page breaks and repeated table header;
- no clipped totals or columns;
- product image only when present and semantically useful.

## 11. Responsive Behavior

| Range | Behavior |
|---|---|
| `>= 1280px` | Expanded sidebar, multi-column dashboards, full tables |
| `768-1279px` | Collapsible sidebar, two-column cards, compact tables |
| `< 768px` | Drawer navigation, single-column forms, stacked records, bottom-safe actions |

Requirements:

- no horizontal page scrolling;
- modals fit the viewport and their body scrolls independently;
- product and client selectors remain searchable on touch devices;
- primary actions remain visible without covering content;
- tables expose the most important fields first on mobile.

## 12. Accessibility

- WCAG 2.1 AA target;
- visible keyboard focus;
- semantic headings and landmarks;
- labels tied to form controls;
- no color-only status communication;
- minimum 44x44 px touch target where practical;
- dialogs trap focus and restore it on close;
- live regions for asynchronous success and failure;
- charts include textual values and do not rely only on color.

## 13. Content Standards

- Use sentence case for labels and headings.
- Use `Client Requirement`, never `Client Request`.
- Use `Field Reconciliation`, never `Installer Returns`.
- Use `Field Service Assignment`, never `Installer Job`.
- Use `Senior Management`, not `Super Admin`, in business-facing copy.
- Use `Super Admin` only in technical administration or internal role configuration.
- Avoid AI-sounding promotional copy, filler explanations, and repeated instructions.
- Display the next action and prerequisite in one concise sentence.

## 14. Quality Checklist

Before approving a screen:

- Does it use the canonical term?
- Is the primary action obvious and permission-appropriate?
- Are prerequisites and blocked states clear?
- Does the page avoid duplicate fields and duplicate searches?
- Is purchasing cost hidden outside procurement?
- Are empty, loading, success, and error states present?
- Does it work at desktop, tablet, and mobile widths?
- Does refresh preserve the authenticated workspace?
- Is the print/export view free of application chrome?
- Can the workflow be understood without developer guidance?
