# TRACK360 ERP - Portal-wise System Flow and Test Report

Date: 27-Aug-2026

Project in scope:

- Frontend: React/Vite (`erp-2`)
- Backend: Node/Express/PostgreSQL (`erp-1`)
- Old .NET project is not part of this report.

## 1. Portal and Role Structure

TRACK360 has four main work areas. Installer field work is handled inside the Inventory workflow and is not counted as a fifth independent portal.

| Work area | Login role | Main responsibility |
| --- | --- | --- |
| CSR / CRM | `csr_officer` | Client, quotation, client approval, order conversion, complaints and read-only invoice tracking |
| Inventory | `inventory_officer` | Token, stock check, PO, stock receiving, dispatch, installer reconciliation, returns and Finance handoff |
| Finance | `finance_officer` | Billing approval, final invoice, invoice edit/print/PDF, summaries and accounts |
| Super Admin | `super_admin` | Full CRM, Inventory, Finance, EMS, user management, logs and settings access |
| Joint operations | `inv_fin_admin` | Inventory and Finance access only |

## 2. Complete Business Journey

The intended end-to-end business flow is:

`Client request -> CRM client -> Quotation -> Client approval -> CRM order -> Inventory token -> Stock check -> PO if short -> Receive stock -> Dispatch -> Installer reconciliation -> Inventory return confirmation -> Send bill to Finance -> Finance approval -> Issued invoice -> CRM invoice visibility -> Finance summary/accounts`

Every handoff must use the same linked records:

- `customer_id`
- `quotation_id`
- `crm_order_id`
- `token_number`
- `purchase_order_id` when stock is purchased
- `dispatch_id`
- `invoice_id`

## 3. CSR / CRM Portal

### Role

`csr_officer`

### Pages

1. Dashboard
2. Sales Leads
3. Clients List
4. Add / Edit Client
5. Client Detail
6. Quotations List
7. Create / Edit Quotation
8. Quotation Detail
9. Orders Tracker
10. Complaints
11. Invoices View (read-only)

### CRM User Journey

1. Client contacts CSR with a product/service requirement.
2. CSR opens `Clients` and searches by name, company, email or phone.
3. If the client does not exist, CSR opens `Add Client` and saves:
   - Client/company name
   - Contact person
   - Email
   - Phone
   - Address
   - Active/Inactive state
4. CSR opens `Create Quotation`.
5. CSR selects the client from the searchable client selector.
6. CSR selects a catalog product.
7. Product price is loaded from the product price tier or `unit_price`.
8. CSR enters quantity. Line total is calculated automatically.
9. CSR can add a custom item with a manual description and price.
10. System calculates Subtotal, GST and Grand Total.
11. CSR chooses one action:
    - `Save as Draft` -> quotation status `DRAFT`
    - `Generate & Send` -> quotation status `SENT`
12. System generates one unique quotation number: `QT-YYYY-XXXX`.
13. Repeating the same submit request must return the same quotation through its idempotency key.
14. Client opens the public approval link without login.
15. Client approves or rejects:
    - Approve -> `APPROVED`
    - Reject -> `REJECTED` with reason
16. On an approved quotation, CSR clicks `Convert to Order`.
17. System creates one order number: `ORD-YYYY-XXXX`.
18. Duplicate conversion returns the existing order.
19. The new order becomes visible in CRM Orders Tracker and Inventory Incoming Orders.

### CRM Status Flow

`DRAFT -> SENT -> APPROVED or REJECTED -> EXPIRED when applicable`

After conversion, the linked order continues independently through:

`PENDING_REVIEW -> AWAITING_STOCK or STOCK_OK -> PARTIALLY_DISPATCHED or FULLY_DISPATCHED -> COMPLETED -> BILL_SENT -> INVOICED`

### CRM Data Handoff

- CRM creates: customer, quotation and quotation items.
- Public approval updates the same quotation record.
- Convert to Order creates one linked `crm_orders` record.
- CRM can later read Inventory order progress and the Finance-issued invoice.

## 4. Inventory Portal

### Role

`inventory_officer`

### Pages

1. Inventory Dashboard
2. Inventory Control / Flow Dashboard
3. Incoming Orders
4. Token Management
5. Product Catalog
6. Serial / Barcode Scan
7. Purchase Orders
8. Installer Dispatch
9. Installer Returns
10. Stock Movement Ledger
11. Master Setup
12. Operations Matrix

### Inventory User Journey

1. Inventory officer opens `Incoming Orders`.
2. CRM-approved converted order appears automatically.
3. Inventory clicks `Generate Token`.
4. System generates one unique token: `TKN-YYYY-XXXX`.
5. Duplicate token generation returns the existing token.
6. Stock check runs against every linked quotation item.
7. If all items are available:
   - Order stock status becomes `STOCK_OK`.
   - Order appears in Installer Dispatch ready queue.
8. If any item is short:
   - Order stock status becomes `AWAITING_STOCK`.
   - Inventory clicks `Create PO`.
9. Purchase Order form receives these values automatically:
   - CRM order number
   - Quotation number
   - Client reference
   - Short product lines
   - Required quantity
   - Product cost/price where available
10. Inventory selects a supplier. Supplier is the vendor from whom stock is purchased; the client is not the supplier.
11. Inventory sets Expected Delivery Date.
12. GST remains adjustable.
13. Inventory may add or remove PO items before saving.
14. System creates `PO-YYYY-XXXX`.
15. On `Receive Stock`, inventory enters received quantity per PO item.
16. System updates:
   - Product stock quantity
   - PO received quantity/status
   - Stock movement ledger
   - Linked order stock status
17. Once stock is complete, order becomes `STOCK_OK` and appears in Dispatch Ready Queue.
18. Inventory opens the ready order and selects an active installer.
19. Installer selection is required.
20. Inventory confirms dispatch.
21. System creates `DSP-YYYY-XXXX`.
22. Stock is deducted automatically.
23. Serialized items become `ALLOCATED`.
24. CRM order becomes `PARTIALLY_DISPATCHED` or `FULLY_DISPATCHED`.

### Installer Field Step Inside Inventory

1. Assigned installer receives only the linked dispatch/job.
2. Installer marks each dispatch item:
   - Given / installed
   - Consumable given / used
   - Not used / return
3. Each item update must save immediately.
4. Used serialized item becomes `INSTALLED`.
5. Not-used serialized item becomes `RETURNED` until Inventory confirms condition.
6. Installer completes the job only after all items are marked.
7. The return request becomes visible in `Installer Returns`.

### Inventory Return Journey

1. Inventory opens `Installer Returns`.
2. Inventory reviews each returned item.
3. Inventory selects condition:
   - Good -> return quantity to stock
   - Damaged -> log as damaged; do not add available stock
   - Consumable Used -> log as used; do not add stock
4. Inventory confirms returns once.
5. System updates stock, serial lifecycle and movement ledger once.
6. Inventory clicks `Send Adjusted Bill to Finance`.
7. System creates one Draft customer invoice linked to dispatch, quotation and client.
8. CRM order becomes `BILL_SENT`.

### Inventory Data Handoff

- Reads CRM order and quotation items.
- Writes token and stock status to the linked order.
- Writes PO, receipt and stock movements.
- Writes dispatch and dispatch items.
- Writes installer usage/return quantities.
- Creates the Draft invoice for Finance.

## 5. Finance Portal

### Role

`finance_officer`

### Pages

1. Finance Dashboard
2. Billing Approvals
3. Billing Approval Detail
4. Invoices
5. Summaries
6. Accounts

### Finance User Journey

1. Inventory sends the adjusted bill.
2. Finance opens `Billing Approvals`.
3. The Draft bill appears with status `PENDING` approval.
4. Finance opens the detail page and reviews:
   - Installed items
   - Returned item deductions
   - Extra item additions
   - Original total
   - Return deduction
   - Extra amount
   - Final amount
5. Finance selects expense type and HBL invoice format.
6. Finance approves or rejects:
   - Approve -> customer invoice status `ISSUED`
   - Reject -> invoice status `CANCELLED`, order status `BILL_REJECTED`
7. On approval, CRM order becomes `INVOICED`.
8. Issued invoice appears in Finance Invoices and CRM Invoices View.
9. Finance may edit invoice fields/items through the invoice edit form.
10. Finance may print/save the isolated HBL invoice or summary as PDF.
11. Finance Summaries provide:
    - Invoice rows
    - Monthly summary
    - Totals
    - Expense-type totals
    - Client-wise totals
12. Accounts builds receivable, revenue and sales tax ledger entries from issued invoices.

### Finance Data Handoff

- Reads Draft invoice created from Inventory dispatch/returns.
- Updates the same invoice to `ISSUED` on approval.
- Updates CRM order to `INVOICED`.
- Makes the invoice visible to CRM.
- Includes the invoice in summaries and accounts.

## 6. Super Admin and EMS

### Role

`super_admin`

### Super Admin Pages

1. Admin Dashboard
2. User Management
3. All Orders Tracker
4. System Logs
5. Settings
6. CRM Overview
7. Inventory Overview
8. Finance Overview
9. Full CRM pages
10. Full Inventory pages
11. Full Finance pages

### EMS Pages Retained for Super Admin

- Employees
- Attendance
- Leave
- Leave Wallet
- Penalty
- Announcements
- Calendar
- Directory
- HR settings and reports allowed by Super Admin role

### Super Admin User Journey

1. Super Admin monitors combined KPIs and alerts from all portals.
2. Super Admin opens separate overview/detail pages instead of placing all operational tables on one dashboard.
3. Super Admin creates or disables users and assigns roles/permissions.
4. Super Admin can open CRM, Inventory and Finance operational pages.
5. Super Admin continues to use the existing EMS workspace for employee management.
6. Audit logs record important login and system actions.

## 7. Role Isolation Expected Result

| Role | CRM | Inventory | Finance | Admin/EMS |
| --- | --- | --- | --- | --- |
| CSR Officer | Allowed | Blocked | Blocked | Blocked except shared directory/matrix routes |
| Inventory Officer | Blocked | Allowed | Blocked | Blocked except shared directory/matrix routes |
| Finance Officer | Blocked | Blocked | Allowed | Blocked except shared directory routes |
| Inventory + Finance Admin | Blocked | Allowed | Allowed | Blocked except shared directory/matrix routes |
| Super Admin | Allowed | Allowed | Allowed | Allowed |

## 8. Live Test Record

The live database test created these clearly marked QA records:

- Client: `QA E2E Client 20260827114744`
- Quotation: `QT-2026-0044`
- Order: `ORD-2026-0028`
- Token: `TKN-2026-0006`
- Purchase Order: `PO-2026-0017`
- Dispatch: `DSP-2026-0002`
- Invoice: `INV-2026-0012`

## 9. Test Results

### Automated Tests

- Backend: PASS - 30 files, 142 tests passed.
- Frontend unit/build command: NOT VERIFIED in the Codex sandbox because Vite/esbuild is denied access while resolving the absolute `vite.config.ts` path. This is a test-environment path restriction, not a captured application assertion failure.

### Authentication and Role Access

- CSR login: PASS
- Inventory login: PASS
- Finance login: PASS
- Joint Inventory/Finance login: PASS
- Super Admin login: PASS
- CSR blocked from Inventory and Finance APIs: PASS
- Inventory blocked from CRM and Finance APIs: PASS
- Finance blocked from CRM and Inventory APIs: PASS
- Joint role allowed Inventory and Finance only: PASS
- Super Admin allowed CRM, Inventory and Finance: PASS

### CRM to Inventory

- Client create: PASS
- Quotation create: PASS
- `QT-YYYY-XXXX` format: PASS
- Quotation appears in list: PASS
- Duplicate quotation submit blocked by idempotency: PASS
- Public client link without login: PASS
- Public approval updates quotation to `APPROVED`: PASS
- Convert to Order: PASS
- `ORD-YYYY-XXXX` format: PASS
- Duplicate order conversion blocked: PASS
- Order appears in Inventory queue: PASS
- Generate Token: PASS
- `TKN-YYYY-XXXX` format: PASS
- Duplicate token blocked: PASS
- Automatic stock shortage status `AWAITING_STOCK`: PASS
- PO creation with supplier, dates, GST and linked items: PASS

### Critical Inventory Failures

1. Purchase Order list: FAIL
   - API returns HTTP 500.
   - Database error: `column poi.total_price does not exist`.
   - Current table has `quantity` and `unit_price`, but no `total_price` column.
   - Result: PO rows cannot load, so the user cannot open normal Receive Stock flow.

2. Receive Stock: FAIL
   - API returns HTTP 500.
   - Database error: `inconsistent types deduced for parameter $1`.
   - The PO status update query reuses the same parameter in incompatible contexts.
   - Result: received quantity, stock ledger and automatic `STOCK_OK` handoff do not complete through the intended PO flow.

### Downstream Inventory Tests Using Independent QA Stock Setup

These checks used a temporary direct product quantity update because the normal PO Receive step is blocked.

- Token refresh changed linked order to `STOCK_OK`: PASS
- Order appeared in Dispatch Ready Queue: PASS
- Installer was required and linked: PASS
- `DSP-YYYY-XXXX` format: PASS
- Dispatch created with linked quotation/client/items: PASS
- Stock deducted from 2 to 0: PASS
- Installer reconciliation saved used and returned quantities: PASS
- Bill adjustment calculated `170,000 - 85,000 = 85,000`: PASS

### Critical Return Failures

1. Return status is premature: FAIL
   - After installer reconciliation, return list already shows `CONFIRMED` before Inventory confirms it.
   - Expected status at this point is `PENDING`.

2. Stock changes too early: FAIL
   - Returned non-serial stock is added during installer reconciliation.
   - Expected behavior is to add Good stock only after Inventory confirmation.
   - This can cause a double stock increase if confirmation also succeeds.

3. Confirm Returns: FAIL
   - API returns HTTP 500.
   - Database error: `FOR UPDATE cannot be applied to the nullable side of an outer join`.
   - Result: Inventory cannot complete the official return-confirmation step.

### Finance Tests Performed Independently After Return Blocker

The Finance handoff endpoint was called independently to verify downstream behavior.

- Draft invoice created from dispatch: PASS
- `INV-YYYY-XXXX` format: PASS
- Invoice appeared in Billing Approvals: PASS
- Initial approval state `PENDING`: PASS
- Finance approval changed invoice to `ISSUED`: PASS
- Finance invoice detail showed `ISSUED`: PASS
- CRM Invoices View contained the same invoice: PASS
- CRM order changed to `INVOICED`: PASS
- Finance summaries loaded rows, monthly summary, totals, expense-type totals and client totals: PASS

## 10. Final Audit Conclusion

The system is not yet fully end-to-end complete through the normal screens.

Working chain:

`CRM client -> quotation -> public approval -> order -> Inventory queue -> token -> stock check`

Blocked normal chain:

`Purchase Order list -> Receive Stock`

Independently verified downstream chain:

`STOCK_OK -> dispatch -> installer reconciliation -> bill draft -> Finance approval -> issued invoice -> CRM invoice -> summaries`

However, the official return confirmation is also blocked and return stock/status timing is incorrect.

The highest-priority fix order is:

1. Fix Purchase Order list query.
2. Fix Receive Stock status update query.
3. Fix Installer Return list status mapping.
4. Stop stock from being added during installer reconciliation.
5. Fix Confirm Returns locking query.
6. Rerun the same QA journey without any manual stock workaround.
7. Run browser-level click testing for every page and print/PDF layout after the API chain is fully green.
