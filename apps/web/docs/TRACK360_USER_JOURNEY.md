# TRACK360 ERP User Journey

This document explains the working journey for the React + Node TRACK360 ERP demo. It is written for office walkthroughs, lead review, and future implementation phases.

## 1. Login And Role Access

Open the frontend:

```text
http://localhost:8081/login
```

Use the correct demo account for the role being tested.

- Super Admin sees every workspace.
- CSR Officer sees CSR / CRM and sales handoff only.
- Inventory Officer sees inventory and stock operations.
- Finance Officer sees accounts, invoice builder, billing and summaries.
- Inventory & Finance Admin sees inventory plus finance.

## 2. Super Admin Launchpad

After super admin login, open `Launchpad`.

Expected workspace cards:

- HR Dashboard
- Attendance
- Employees
- CSR / CRM
- Inventory Logistics
- Invoice Builder
- Finance & Client Billing
- Matrix Operations
- Announcements
- Calendar Events
- Directory

Super Admin can open every module from sidebar as well.

## 3. CSR / CRM Journey

Open:

```text
CSR / CRM
```

CSR flow:

1. Click `Register New Client` if the client does not exist.
2. Enter company/client name, contact person, email, phone and address.
3. Save client.
4. Click `+ Add Sales Lead`.
5. Select existing registered client or create a direct lead.
6. Add inquiry title, for example `50 Cameras for HBL Branch`.
7. Save lead.
8. Click `Create Quotation` or `Generate Quotation`.
9. Select client.
10. Add quotation items, quantity and price.
11. Save quotation.
12. Click `Send to Client`.
13. When approval is received manually, click `Client Approved / Send to Inventory`.

Current email behavior:

- Email button/action is UI-ready.
- Actual SMTP/email sending will be connected in a later phase.
- For now, the system saves status/action for workflow demo.

## 4. Inventory Journey

Open:

```text
Inventory Logistics
```

Inventory flow:

1. Inventory officer views stock dashboard.
2. Products, categories, serials/IMEIs and customers are managed here.
3. Approved quotation/job from CSR is treated as inventory work queue.
4. Inventory selects stock.
5. Serial-tracked items get serial/IMEI assigned.
6. Non-serial consumables are issued by quantity.
7. Installer handoff is recorded.
8. Used, unused, returned, damaged and extra material will be reconciled.
9. Final used-item summary goes to Finance for billing.

Current state:

- Product, category, serial, customer, installation, complaint and replacement actions exist.
- Deeper installer-specific mobile/app workflow is still next phase.

## 5. Invoice Builder Journey

Open:

```text
Invoice Builder
```

Finance invoice builder flow:

1. Select client.
2. Select saved template if available.
3. Enter invoice name.
4. Select invoice date.
5. Enter branch name and branch code.
6. Add inventory products from dropdown.
7. Add manual rows if needed.
8. Edit columns.
9. Edit formulas.
10. Edit header, footer, bank line and signature name.
11. Click `Save Template` to save the client-specific invoice layout.
12. Click `Preview`.
13. Confirm invoice formatting.
14. Click `Save Draft Invoice`.

Formula examples:

```text
quantity * unit_price
value_excl * gst_rate / 100
value_excl + gst_amount
```

Current email behavior:

- `Email Later` is visible in preview.
- It does not send email yet.
- Invoice is saved first, then email will be connected in the email phase.

## 6. Monthly Summary Journey

Open:

```text
Invoice Builder -> Monthly Summaries
```

Monthly summary flow:

1. Select client in builder.
2. Open `Monthly Summaries`.
3. Enter summary title/month.
4. Select saved invoices for that client.
5. Click `Generate Summary`.
6. System collapses selected invoices into one client summary.

Future phase:

- The exact summary format will be implemented when the final sample format is provided.
- Summary email sending will be connected later.

## 7. Finance And Client Billing

Open:

```text
Finance & Client Billing
```

This screen remains available for:

- Billing ledger.
- Saved invoice list.
- Existing HBL style invoice preview.
- Master summaries and reporting.

The new `Invoice Builder` is the focused working area for configurable client templates.

## 8. Final End-To-End Flow

```text
Client contacts CSR
-> CSR registers/selects client
-> CSR creates lead
-> CSR creates quotation
-> CSR sends quotation action
-> Client approval received manually
-> CSR marks approved
-> Inventory receives job
-> Inventory assigns stock/serials
-> Installer work/reconciliation
-> Finance opens Invoice Builder
-> Finance selects client/template
-> Inventory items auto-added or manual rows entered
-> Preview invoice
-> Save draft invoice
-> Monthly summary generated from selected invoices
-> Email phase later
```

## 9. What Is Complete In This Pass

- Super Admin launchpad now shows CSR, Inventory, Finance, Matrix and Invoice Builder.
- Role mapping supports CSR, inventory officer, finance officer and inventory-finance admin.
- CSR login and CRM APIs are working.
- Invoice Builder screen is added.
- Client templates can be saved.
- Rows, columns and formulas are editable.
- Inventory products can be inserted into invoice rows.
- Invoice preview is available before saving.
- Draft invoice saving is supported.
- Monthly summary can collapse selected saved invoices.

## 10. Next Implementation Phase

- Connect approved CSR quotation directly into a visible inventory job queue.
- Add installer-specific workspace/app.
- Reconcile used/returned/extra stock from installer.
- Auto-create invoice rows from completed installer dispatch.
- Implement exact client summary format after sample is provided.
- Connect SMTP/email service for quotation, invoice and summary sending.
