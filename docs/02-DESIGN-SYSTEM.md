# TRACK360 Design System

**Version:** 2.0
**Goal:** A calm, fast, professional ERP interface for 1,000+ daily users. Odoo-style structure (app modules, status bars, chatter, smart links) with a cleaner, more modern look.

---

## 1. Principles

1. **One shell.** Every user gets the same layout; only content and menus change.
2. **Next action first.** The primary button and the blocked reason are always visible.
3. **Dense but calm.** Enterprise users scan lists all day: compact rows, strong alignment, few colors.
4. **Color means something.** Accent = workspace, badge color = status, red = problem only.
5. **Everything is linked.** Any reference number is clickable and opens a preview drawer.
6. **Fast by design.** Skeletons not spinners, virtualized long lists, no layout shift.

## 2. Names

- Product: **TRACK360 ERP**
- Company line: **Electronic Safety & Security (Pvt.) Ltd.**
- Login heading: **Sign in to TRACK360**
- Login subline: **ESSPL Operations Platform**
- Dashboard headings (every dashboard page must show its heading as the page title):

| Menu item | Page heading |
|---|---|
| Sales, Dashboard | **Sales Dashboard** |
| Inventory, Dashboard | **Inventory Dashboard** |
| Finance, Dashboard | **Finance Dashboard** |
| Management, Dashboard | **Executive Dashboard** |
| Home | **My Work** |

Each heading has a one-line purpose subtitle, for example "Requirements, quotations and orders at a glance".

## 3. Color theme

Theme name: **Harbor Navy**. Deep navy structure, confident blue actions, quiet neutrals, one accent per workspace.

### 3.1 Core palette

| Token | Hex | Use |
|---|---|---|
| `--navy-950` | `#081A33` | Sidebar background, login side panel |
| `--navy-900` | `#0B2447` | Headings on light, sidebar hover |
| `--navy-800` | `#12315F` | Sidebar active background |
| `--blue-700` | `#1D4ED8` | Primary buttons, links (AA on white) |
| `--blue-600` | `#2563EB` | Focus ring, selected states |
| `--blue-100` | `#DBEAFE` | Selected row, active nav fill (light UI) |
| `--blue-50` | `#EFF6FF` | Hover tint, info panels |
| `--page` | `#F4F6FA` | App background |
| `--surface` | `#FFFFFF` | Cards, tables, forms, documents |
| `--surface-2` | `#F8FAFC` | Table header, zebra, secondary panels |
| `--border` | `#E2E8F0` | Dividers, table lines |
| `--border-strong` | `#CBD5E1` | Inputs, disabled |
| `--text` | `#0F172A` | Primary text |
| `--text-2` | `#334155` | Secondary text |
| `--text-3` | `#64748B` | Captions, placeholders (min 4.5:1 on white) |
| `--on-dark` | `#E6EEFA` | Text on navy |
| `--on-dark-2` | `#9FB3D1` | Muted text on navy |

### 3.2 Workspace accents

Used for the sidebar indicator, page-header stripe, and KPI icon tint. Never for buttons or status.

| Workspace | Accent | Tint |
|---|---|---|
| Sales | `#2563EB` | `#DBEAFE` |
| Inventory | `#0D9488` | `#CCFBF1` |
| Finance | `#D97706` | `#FEF3C7` |
| Management | `#4F46E5` | `#E0E7FF` |

### 3.3 Status colors

| Family | Text | Background | Border | Examples |
|---|---|---|---|---|
| Neutral | `#334155` | `#F1F5F9` | `#CBD5E1` | Draft, Planned, Closed |
| Info | `#1D4ED8` | `#DBEAFE` | `#93C5FD` | Sent, Issued, Stock Check |
| Attention | `#92400E` | `#FEF3C7` | `#FCD34D` | Pending Approval, Awaiting Stock, Awaiting Closeout |
| Success | `#166534` | `#DCFCE7` | `#86EFAC` | Approved, Received, Paid, Accepted |
| Danger | `#991B1B` | `#FEE2E2` | `#FCA5A5` | Rejected, Overdue, Lost, Failed |
| Governance | `#3730A3` | `#E0E7FF` | `#A5B4FC` | Locked, Voided, Under Review |

Rules: never rely on color alone (badges always include text); primary actions are always blue; green marks confirmed success, never a general button; red is only for failure, rejection, overdue, and destructive actions; gradients are decoration only.

### 3.4 CSS tokens

```css
:root {
  --navy-950:#081A33; --navy-900:#0B2447; --navy-800:#12315F;
  --blue-700:#1D4ED8; --blue-600:#2563EB; --blue-100:#DBEAFE; --blue-50:#EFF6FF;
  --page:#F4F6FA; --surface:#FFFFFF; --surface-2:#F8FAFC;
  --border:#E2E8F0; --border-strong:#CBD5E1;
  --text:#0F172A; --text-2:#334155; --text-3:#64748B;
  --on-dark:#E6EEFA; --on-dark-2:#9FB3D1;
  --success:#166534; --success-bg:#DCFCE7;
  --warning:#92400E; --warning-bg:#FEF3C7;
  --danger:#991B1B;  --danger-bg:#FEE2E2;
  --info:#1D4ED8;    --info-bg:#DBEAFE;
  --accent-sales:#2563EB; --accent-inventory:#0D9488;
  --accent-finance:#D97706; --accent-management:#4F46E5;
  --radius-sm:6px; --radius-md:8px; --radius-lg:12px;
  --shadow-1:0 1px 2px rgba(15,23,42,.06);
  --shadow-2:0 6px 20px rgba(15,23,42,.10);
  --shadow-3:0 16px 40px rgba(15,23,42,.18);
  --focus:0 0 0 3px rgba(37,99,235,.35);
}
```

A dark theme is a Phase 2 option. All colors must be referenced through tokens so it can be added without rewrites.

## 4. Typography

| Use | Font | Fallback |
|---|---|---|
| Application | Inter | system-ui, Arial, sans-serif |
| Numbers in tables | Inter with tabular figures | — |
| Identifiers (QT, SO, INV...) | JetBrains Mono or IBM Plex Mono | Consolas, monospace |
| Printed documents | Inter (default), Georgia only if the approved template needs it | Times New Roman |

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Page title | 26 / 34 | 700 | Page heading (dashboard headings use this) |
| Section title | 18 / 26 | 650 | Card and section headings |
| Card title | 15 / 22 | 650 | Panel titles |
| Body | 14 / 21 | 400 | Default |
| Table | 13 / 20 | 400 | Rows (compact) |
| Label | 12 / 18 | 600 | Form labels, table headers |
| Caption | 11 / 16 | 500 | Metadata |
| KPI value | 28 / 34 | 700 | Dashboard numbers |

No negative letter spacing. Sentence case for labels and headings. Numbers right-aligned with tabular figures.

## 5. Spacing, size, elevation

- Base unit 4 px. Steps: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Control height 36 px compact (default for data screens), 40 px forms, 44 px touch.
- Sidebar 248 px expanded, 64 px collapsed. Top bar 56 px. Content max width 1680 px.
- Radius: 6 controls, 8 cards, 12 dialogs.
- Elevation: page (0), bordered surface (1, no heavy shadow), dropdown or sticky bar (2), modal or drawer (3).
- Tables and sections are flat bordered surfaces. Do not nest cards inside cards.

## 6. Application shell

```
+----------------------------------------------------------------------+
| [logo] Workspace ▾   Breadcrumb            Search Ctrl+K   🔔  ✓  User |  56px top bar
+----------+-----------------------------------------------------------+
| Sidebar  |  Page title            [Secondary]  [Primary action]      |
| (navy)   |  Subtitle                                                 |
|          |  Status / KPI strip                                       |
| Sales    |  Filters  [chips]                            View ▾  ⚙   |
|  Dash    |  ┌──────────────────────────────────────────────────────┐ |
|  Clients |  │ Table / Kanban / Form                                │ |
|  ...     |  └──────────────────────────────────────────────────────┘ |
+----------+-----------------------------------------------------------+
```

### Top bar

- Workspace switcher (only workspaces the user may access).
- Breadcrumb.
- **Global search (Ctrl+K command palette):** records by number or name, plus jump-to-page commands.
- Notifications bell, activities (to-do) counter, branch selector when the user has several branches, account menu.
- Role badge inside the account menu, not in the bar.

### Sidebar

- Dark navy background, workspace accent bar on the active item, light text.
- Groups: the workspace's pages (see PRD section 5). No disabled items for other departments.
- Collapsible on desktop, drawer on tablet and phone.

## 7. Page templates

### 7.1 Dashboard

- Page title = dashboard heading (Sales Dashboard, and so on), subtitle, period filter on the right.
- Row 1: 4 to 8 KPI cards (label, value, trend or hint, click to filtered list).
- Row 2: "Needs your action" queue (next action per row) and "Attention" exceptions list.
- Row 3: one or two charts with text values (bar, line). No decorative charts.
- Long dashboards use tabs, not endless scrolling. Data served from read models, loads under 2 s with skeletons.

### 7.2 List

- Header: title, primary action, secondary actions (Import, Export).
- Filter bar: search, filter chips, saved views dropdown, column chooser.
- Table: sticky header, virtualized when over 100 visible rows, server pagination (25/50/100), bulk select with bulk actions, row hover actions, sortable only where supported, identifiers in monospace and clickable.
- Empty state with a clear action. Active filters always visible with a Clear all.
- Phone: stacked records showing the 3 most important fields.

### 7.3 Form (the main record page)

- Header: record number, title, **status bar** (step path with current step highlighted), primary action, secondary actions, "More" menu.
- **Smart links** row: buttons with counts of related records.
- Body: grouped sections in 2 columns on desktop, 1 on phone. Tabs for Lines, Terms, Attachments, Record Trail.
- **Chatter panel** on the right (or below on tablet/phone): Notes, Send email, Activities, timeline of status changes and audit facts, attachments, followers.
- Sticky footer with Save Draft and the primary action on long forms.
- Unsaved-change guard. Field errors under the field and an error summary at the top.

### 7.4 Kanban (Requirements, Approvals, Field Jobs)

Columns by status, cards with number, client, amount or date, owner avatar, overdue flag. Drag only where the transition is permitted; blocked drops show the reason.

### 7.5 Report

Filters on top, summary totals row, table or pivot, Export. Charts must show values as text as well.

### 7.6 Printable document

Dedicated route, A4 safe, no app chrome, repeated table header, controlled page breaks, totals never clipped, ESSPL identity, client block, document number and date, item table, currency and rate, tax method and totals, terms, signatory area. Quotation and invoice share one layout; differences are only the document-specific blocks.

## 8. Components

### 8.1 Buttons

| Variant | Use |
|---|---|
| Primary (blue) | One per page: Save, Submit for Approval, Approve, Issue Invoice |
| Secondary (outline) | Back, Preview, Refresh |
| Ghost | Low emphasis actions |
| Destructive (red) | Reject, Void, Cancel record |
| Icon-only | Standard actions, always with tooltip and aria-label |

Label pattern: verb + object (Approve Quotation, Receive Materials, Issue Invoice). Disabled buttons show the reason in a tooltip and inline text. Loading buttons keep their width.

### 8.2 Status badge

Pill, 12 px semibold text, colors from section 3.3, optional leading dot. Text is Title Case in the UI, UPPER_SNAKE in APIs.

### 8.3 Form controls

- Labels always visible, required marked with `*` and aria-required.
- Searchable selects (async) for clients, products, vendors, technicians.
- Money inputs with currency and tabular alignment; exchange rate and tax controls grouped together.
- Date pickers with keyboard entry; date-time in local time, stored UTC.
- Inline validation on blur, full validation on submit, values preserved after errors.

### 8.4 Tables

Row height 40 px (compact 32 px option), header 36 px, zebra off by default, selected row `--blue-100`, right-aligned numbers, ellipsis with tooltip on long text, column widths persisted per user.

### 8.5 Feedback

- Toast: confirmed success (auto-dismiss).
- Banner: unmet prerequisite or recoverable problem.
- Error panel: what failed and one recovery step. Never show raw server messages.
- Persistent notice for email delivery status.

### 8.6 Dialogs and drawers

- Dialog: short confirmations and small edits (max 560 px).
- Right drawer: record preview and activity, opened from any reference number.
- Full page: quotation, purchase order, closeout, invoice work.
- Focus is trapped in dialogs and restored on close.

### 8.7 Other

Avatar, tag/chip, tabs, stepper (status bar), breadcrumb, KPI card, empty state, skeleton, timeline item, file uploader with progress, date range picker, command palette, keyboard shortcut hints.

## 9. Workflow button labels

| Area | Labels |
|---|---|
| Requirement | Record Requirement, Qualify Requirement, Create Quotation |
| Quotation | Save Draft, Submit for Approval, Approve, Return for Revision, Reject, Send to Client, Copy Review Link |
| Client decision | Mark Accepted, Mark Declined, Request Revision |
| Order | Release Sales Order |
| Inventory | Run Stock Check, Create Purchase Order, Receive Materials |
| Field Service | Issue Materials, Start Job, Record Completion, Capture Client Sign-off |
| Closeout | Confirm Closeout, Send to Billing Queue |
| Finance | Approve Billing, Return for Correction, Generate Invoice, Issue Invoice, Record Payment |

## 10. Responsive behavior

| Width | Behavior |
|---|---|
| 1280 px and up | Expanded sidebar, multi-column dashboard, full tables, chatter on the right |
| 768 to 1279 px | Collapsed sidebar, two-column cards, chatter below the form |
| Under 768 px | Drawer navigation, single column, stacked records, sticky bottom action bar |

No horizontal page scroll. Modal bodies scroll independently. Touch targets 44 px.

## 11. Accessibility

WCAG 2.1 AA. Visible focus ring (`--focus`). Semantic landmarks and headings. Labels bound to inputs. No color-only meaning. Live regions for async results. Charts have text values. Full keyboard operation including the command palette. Respect `prefers-reduced-motion`.

## 12. Motion

Short and functional: 120 to 180 ms for hover and focus, 200 ms for drawers and dialogs, no bouncing or decorative animation.

## 13. Content standards

- Use glossary names from the PRD. Never say "Portal", "Token" (say Stock Check), "Installer".
- Say "Senior Management", not "Super Admin", in business screens.
- One sentence for next action plus prerequisite. No filler, no promotional wording.
- Errors say what happened and what to do next.

## 14. Screen quality checklist

- Correct glossary terms and dashboard heading?
- One obvious primary action, permission-aware?
- Blocked states explained?
- No duplicate fields or duplicate searches?
- Purchase cost hidden outside Purchasing?
- Empty, loading, success, error states present?
- Works at desktop, tablet, phone?
- Print view free of app chrome?
- Keyboard and screen-reader usable?