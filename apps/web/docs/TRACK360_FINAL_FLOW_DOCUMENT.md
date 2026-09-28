# TRACK360 ERP Final Flow Document

This document is the source of truth for the required TRACK360 ERP flow. It explains how the system should work from client requirement to quotation, inventory action, installer handoff, return/reconciliation, CRM billing approval, invoice generation, and monthly summaries.

The main goal is simple: every role should get its own clean workspace, every action should happen on its own clear page, and the system should guide users step by step without mixing everything into one confusing screen.

## 1. Product Vision

TRACK360 ERP should work like a professional office ERP for ESSPL operations.

It should connect:

- CSR / CRM
- Inventory and stock logistics
- Purchasing
- Field service dispatch and material reconciliation
- CRM billing approval
- Finance invoicing
- Client billing summaries
- HR / EMS workspace

The system must feel simple for office users:

- The dashboard explains the current situation.
- Each module has separate pages.
- Every list item is clickable.
- Every record has View, Edit, Delete or Cancel where allowed.
- Every workflow has a visible status.
- Users should always know what the next step is.

## 2. Core Design Rule

Do not place the whole ERP flow on one page.

Each service must have its own workspace:

- CSR / CRM Service
- Inventory / Logistics Service
- Finance Service
- HR / EMS Service

Inside each service, every major action should have its own page.

Example:

- CSR dashboard only explains CSR work and shows quick stats.
- Create Quotation has its own page.
- Quotations Gallery has its own page.
- Approved Job Queue has its own inventory page.
- Purchase Orders has its own page.
- Field Service Dispatch has its own page.
- Invoice Builder has its own finance page.

This keeps the software easy to understand, easy to demo, and scalable for office use.

## 3. Main Roles

### 3.1 Super Admin

Super Admin can access everything.

Super Admin should see:

- CSR / CRM
- Inventory / Logistics
- Finance
- HR / EMS
- User Accounts
- System configuration
- Reports and audit logs

Super Admin is used for full demo and management review.

### 3.2 CSR Officer

CSR Officer handles client communication and quotation creation.

CSR Officer should see:

- CSR Dashboard
- Sales Leads
- Clients
- Quotations
- Create Quotation
- Client Approval Status

CSR should not manage physical stock directly.

### 3.3 Inventory Officer

Inventory Officer handles stock, serials, purchase gaps, installer handoff, and returns.

Inventory Officer should see:

- Inventory Dashboard
- Approved Job Queue
- Product Catalog
- Serial / Barcode Scan
- Purchase Orders
- Vendor Stock Receipts
- Field Service Dispatch
- Field Reconciliation
- Billing Approval Queue
- Stock Movement Ledger
- Master Setup

Inventory Officer should not create final client invoices.

### 3.4 Installer

Installer receives assigned stock and reports what was used, returned, damaged or additionally purchased.

In the final version, installer can have a separate app or separate workspace.

Installer should be able to:

- View assigned jobs
- Scan/mark received serial items
- Mark consumables received
- Add extra required items
- Mark installed/used items
- Mark returned/unused items
- Add field purchase details
- Submit final installation report

### 3.5 CRM Billing Approver

CRM Billing Approver reviews completed installer work before finance creates the invoice.

CRM Billing Approver should:

- Review final used items
- Review returned items
- Review extra field purchases
- Confirm client billing is correct
- Approve the record for finance

### 3.6 Finance Officer

Finance Officer creates invoices and monthly summaries.

Finance Officer should see:

- Finance Dashboard
- Invoice Builder
- Client Billing
- Monthly Summaries
- Invoice Templates
- Payment Ledger
- Matrix Settlement

Finance should generate invoices from approved billing data, not from random manual rows.

## 4. High-Level End-To-End Flow

```text
Client Requirement
-> CSR creates lead/client
-> CSR creates quotation
-> Quotation is sent to client
-> Client approves quotation
-> System generates approval token/receipt
-> Inventory receives approved job
-> Inventory checks stock and purchase gaps
-> Missing items go to purchasing
-> Available stock is assigned
-> Stock is given to installer
-> Installer completes work
-> Field team returns unused items and reports extras
-> CRM approves billing
-> Finance generates invoice
-> Finance saves/prints/downloads invoice
-> Finance generates monthly client summary
```

## 5. Detailed User Journey

### Step 1: Client Requirement Starts

The client contacts CSR and requests a product/service.

Example:

- Client: Haris Construction
- Request: Commissioning day work
- Required item/service: Commissioning Day Rate
- Quantity: 1

CSR opens:

```text
CSR / CRM Service -> Sales Leads
```

CSR creates a new lead.

Required lead fields:

- Client name or company
- Contact person
- Phone
- Email
- Inquiry title
- Required product/service notes
- Branch/site details if available
- Priority
- Expected date

Expected system result:

- Lead is saved in database.
- Lead appears in Leads Pipeline.
- Lead gets a clear status, for example `New Lead`.
- Lead is clickable.

### Step 2: Client Registration

If the client already exists, CSR selects that client.

If the client is new, CSR opens:

```text
CSR / CRM Service -> Clients -> Add Client
```

Client record should include:

- Customer/company name
- Contact person
- Phone
- Email
- Address
- NTN/GST if available
- Branch list if applicable
- Billing preferences
- Client-specific invoice template if configured

Expected system result:

- Client is saved in database.
- Client appears in Client Directory.
- Client can be selected later in quotation and invoice pages.
- Client record has View, Edit and Delete/Deactivate actions.

### Step 3: CSR Creates Quotation

CSR opens:

```text
CSR / CRM Service -> Create Quotation
```

The page should be focused only on quotation creation.

Required quotation fields:

- Client
- Branch name
- Branch code
- Site address
- Quotation date
- Required delivery/install date
- Template style
- Price tier
- Items
- Terms and notes

When CSR selects a product from the inventory dropdown:

- Product name auto-fills.
- Product price auto-fills.
- Available stock shows beside the item.
- Quantity can be changed.
- Line total calculates automatically.
- GST/tax calculates automatically if enabled.

If an item is not available in stock:

- CSR can manually add a purchase-required item.
- Manual item is clearly marked as `Purchase Required`.
- Inventory later sees this item in purchase gap section.

Expected system result:

- Quotation is saved once only.
- Quotation gets a unique sequential number, for example `QT-202608-0031`.
- Multiple Enter/Submit clicks must not create duplicate quotations.
- Quotation appears immediately in Quotations Gallery.
- Quotation status starts as `Draft`.

Important rule:

Quotation generation must be idempotent.

If user presses Enter three times, system still creates only one quotation.

### Step 4: CSR Sends Quotation To Client

CSR opens:

```text
CSR / CRM Service -> Quotations
```

CSR clicks:

```text
Send to Client
```

Expected system result:

- Quotation status changes from `Draft` to `Sent To Client`.
- System generates a secure client approval link.
- System generates public approval token.
- Quotation remains visible in Quotations Gallery.

Current demo behavior:

- Email sending can remain manual for now.
- CSR can copy/share the approval link manually.

Future behavior:

- System will send the link by email automatically.

### Step 5: Client Reviews And Approves

Client opens the approval link.

Public page should show:

- Client name
- Quotation number
- Item list
- Quantity
- Price
- Total
- Terms
- Approve button
- Reject / request changes option
- Client remarks box

Client clicks:

```text
Approve Quotation
```

Expected system result:

- Quotation status becomes `Client Approved`.
- System generates approval receipt/token number.
- Inventory job is created once only.
- Inventory job links back to the quotation.
- Inventory job appears in Approved Job Queue.

Important rule:

Client approval must also be idempotent.

If client clicks approve multiple times, system should not create multiple inventory jobs.

### Step 6: Inventory Receives Approved Job

Inventory Officer opens:

```text
Inventory / Logistics -> Approved Job Queue
```

This page should show only approved client jobs waiting for stock action.

Each job card/table row should show:

- Token/receipt number
- Quotation number
- Client name
- Branch/site
- Items requested
- Available stock count
- Missing stock count
- Purchase-required items
- Current status
- Next action buttons

Possible actions:

- View Job
- Assign Stock / Serial
- Create Purchase Order
- Give To Installer
- Open Billing later

Expected system result:

- Approved quotation is not lost.
- Job is clickable.
- Inventory can see exactly what CSR quoted.
- Inventory cannot accidentally work on the wrong client.

### Step 7: Inventory Checks Stock

Inventory opens:

```text
Inventory / Logistics -> Approved Job Queue -> View Job
```

System splits items into:

1. Available stock items
2. Serial/IMEI tracked items
3. Consumable items
4. Missing/purchase-required items
5. Manual extra items

For serial-tracked items:

- Inventory selects serial/IMEI manually.
- Barcode scanner can later input serial/IMEI.

For consumables:

- Inventory enters quantity issued.

Expected system result:

- Stock can be reserved for the job.
- Reserved stock is visible.
- Remaining stock is visible.
- Missing stock goes to purchasing.

### Step 8: Purchasing Handles Missing Items

Inventory/Purchasing opens:

```text
Inventory / Logistics -> Purchase Orders
```

Purchase Order page should include:

- PO number
- PO date
- Vendor
- Expected delivery date
- Items
- Quantity
- Unit price
- Total
- Status
- Notes

Expected statuses:

- Draft
- Sent To Vendor
- Partially Received
- Fully Received
- Cancelled

When vendor supplies stock:

Inventory opens:

```text
Inventory / Logistics -> Vendor Stock Receipts
```

Receipt page should record:

- Receipt number
- PO number
- Vendor
- Received date
- Received quantity
- Serial numbers if applicable
- Condition
- Received by

Expected system result:

- Received items increase inventory stock.
- Serial items become available for assignment.
- PO status updates automatically.
- Job missing quantity decreases.

### Step 9: Inventory Gives Stock To Installer

Inventory opens:

```text
Inventory / Logistics -> Field Service Dispatch
```

This page should create the stock handoff.

Required dispatch fields:

- Job/token number
- Quotation number
- Client
- Site/branch
- Installer
- Dispatch date
- Items given
- Serial/IMEI numbers
- Consumable quantities
- Notes

Installer handoff action:

```text
Mark Given To Installer
```

Expected system result:

- Dispatch number is generated.
- Status becomes `Given To Installer`.
- Stock moves from warehouse/reserved to installer account.
- Installer can see the assigned job.
- Every item has movement history.

Important inventory rule:

Physical stock-out should happen when stock is marked as given to installer, not just when quotation is created.

### Step 10: Installer Completes Work And Returns Items

Installer opens installer workspace/app.

Installer should see:

- Assigned jobs
- Client/site
- Items received
- Serial numbers
- Consumables received
- Start/completion action

After installation, installer submits:

- Used items
- Returned items
- Damaged items
- Extra items used
- On-the-go field purchases
- Notes
- Optional image/receipt uploads later

Inventory or installer opens:

```text
Inventory / Logistics -> Field Reconciliation
```

Expected system result:

- Returned stock goes back to warehouse.
- Used stock remains consumed/installed.
- Damaged stock is marked damaged.
- Extra field purchases are added to billing summary.
- Dispatch status becomes `Reconciled`.

### Step 11: CRM Approves Billing

CRM opens:

```text
Inventory / Logistics -> Billing Approval
```

or

```text
CSR / CRM Service -> Billing Approval
```

This page should show final reconciled job summary:

- Client
- Quotation
- Token
- Installer
- Items quoted
- Items actually used
- Items returned
- Extra items
- Field purchases
- Final billable amount

CRM clicks:

```text
Approve For Billing
```

Expected system result:

- Status becomes `Billing Approved`.
- Finance queue receives the approved billing record.
- Finance cannot generate final invoice before CRM billing approval unless Super Admin overrides.

### Step 12: Finance Generates Invoice

Finance opens:

```text
Finance Service -> Invoice Builder
```

Finance can open invoice in two ways:

1. From approved quotation
2. From completed/reconciled dispatch

Correct invoice behavior:

- Invoice loads the selected client only.
- Invoice loads the linked quotation/dispatch only.
- Invoice rows auto-fill from approved quotation and reconciled installer usage.
- Product prices come from quotation/product pricing.
- Returned items should not be billed.
- Extra field purchases should be added.
- Manual rows can be added if required.
- All invoice rows remain editable before saving.

Invoice fields:

- Invoice number
- Invoice date
- PO/Ticket number
- Client name
- Branch/reference
- Region
- NTN/GST
- D/C number
- Item rows
- Qty
- Unit price
- Value excluding tax
- GST
- Value including tax
- Amount in words
- Footer payment note
- Account number
- Prepared by
- Signature

Expected system result:

- Invoice preview shows correct selected client.
- Invoice preview does not show stale/default rows.
- Invoice total is never zero when quotation price exists.
- Invoice can be saved as draft.
- Invoice can be printed or saved as PDF.
- Saved invoice appears in Client Billing.

Important rule:

Invoice generation must be idempotent.

If user clicks Save Draft multiple times, system must create only one invoice for that action.

Invoice number must be unique and sequential.

### Step 13: Client Billing And Monthly Summary

Finance opens:

```text
Finance Service -> Client Billing & Summaries
```

Finance selects:

- Client
- Month
- Summary type
- Saved invoices

Summary types:

- Operational Expenses
- Capital Expenses
- Footage Expenses
- Rental Expenses

Each summary type should have:

- Editable limit
- Selected invoices
- Total amount
- Over-limit warning if applicable

Expected system result:

- Selected invoices collapse into one client summary.
- Every client has separate summaries.
- Summary can be previewed.
- Summary can be saved.
- Summary can later be emailed to client.

Future requirement:

Exact final summary format will be implemented after the official sample format is provided.

## 6. Required Page Structure

### 6.1 CSR / CRM Pages

CSR / CRM Service should have these pages:

1. CSR Dashboard
2. Sales Leads
3. Clients
4. Client Detail
5. Create Quotation
6. Quotations Gallery
7. Quotation Detail
8. Client Approval Link
9. Approved For Inventory Handoff
10. CRM Billing Approval

### 6.2 Inventory / Logistics Pages

Inventory / Logistics Service should have these pages:

1. Inventory Dashboard
2. Approved Job Queue
3. Job Detail
4. Product Catalog
5. Serial / Barcode Scan
6. Stock Allocation
7. Purchase Orders
8. Vendor Stock Receipts
9. Field Service Dispatch
10. Field Reconciliation
11. Billing Approval Queue
12. Stock Movement Ledger
13. Master Setup

### 6.3 Finance Pages

Finance Service should have these pages:

1. Finance Dashboard
2. Invoice Builder
3. Invoice Preview
4. Saved Invoices
5. Client Billing
6. Monthly Summaries
7. Invoice Templates
8. Payment Ledger
9. Matrix Settlement

### 6.4 HR / EMS Pages

HR / EMS Service remains separate:

1. ERP Dashboard
2. Employees
3. Add Employee
4. Attendance
5. Leave
6. Payroll
7. Announcements
8. Calendar Events
9. Directory
10. HR Accounts
11. Audit Log

## 7. Status Flow

### 7.1 Quotation Statuses

```text
Draft
-> Sent To Client
-> Client Approved
-> Inventory Job Created
```

Alternative:

```text
Sent To Client
-> Client Rejected
-> Revision Required
-> Draft Revised
```

### 7.2 Inventory Job Statuses

```text
Pending Stock Check
-> Stock Reserved
-> Purchase Required
-> Ready For Dispatch
-> Given To Installer
-> Installer Completed
-> Reconciled
-> Sent For Billing Approval
```

### 7.3 Purchase Order Statuses

```text
Draft
-> Sent To Vendor
-> Partially Received
-> Fully Received
-> Closed
```

### 7.4 Invoice Statuses

```text
Draft
-> Previewed
-> Saved
-> Sent To Client
-> Paid
```

For the current demo, `Sent To Client` email automation can remain a future integration.

## 8. Data Linking Rules

Every record should be linked cleanly.

### 8.1 Lead To Quotation

Quotation should store:

- lead_id
- customer_id
- quotation_number
- quotation_status

### 8.2 Quotation To Inventory Job

Inventory job should store:

- quotation_id
- quotation_number
- customer_id
- approval_token
- approval_receipt_number

### 8.3 Inventory Job To Dispatch

Dispatch should store:

- inventory_job_id
- quotation_id
- customer_id
- installer_id
- dispatch_number

### 8.4 Dispatch To Reconciliation

Reconciliation should store:

- dispatch_id
- used items
- returned items
- damaged items
- field purchases

### 8.5 Billing Approval To Invoice

Invoice should store:

- billing_approval_id
- dispatch_id
- quotation_id
- customer_id
- invoice_number
- invoice_items

### 8.6 Invoice To Summary

Summary should store:

- customer_id
- month/period
- invoice_ids
- invoice_numbers
- summary_type
- subtotal
- tax
- total

## 9. Quotation And Invoice Idempotency Rules

### 9.1 Quotation

When CSR clicks Create Quotation:

- Button should disable while saving.
- Frontend sends idempotency key.
- Backend checks if same idempotency key already created a quotation.
- Backend returns existing quotation if duplicate request comes.
- Quotation number sequence increments only once.

### 9.2 Invoice

When Finance clicks Save Draft Invoice:

- Button should disable while saving.
- Frontend sends idempotency key.
- Backend checks if same key already created invoice.
- Backend returns existing invoice if duplicate request comes.
- Invoice number sequence increments only once.

This prevents duplicate records from Enter key or double-clicking.

## 10. Product Price Auto-Fill Rules

Wherever product is selected:

- Product name appears automatically.
- Product price appears automatically.
- Product description appears automatically if available.
- GST/tax calculates automatically.
- Total calculates automatically.

This applies to:

- Create Quotation
- Invoice Builder
- Purchase Order items
- Field service dispatch where applicable

Manual price entry should still be allowed only when user has permission.

## 11. Dashboard Requirements

### 11.1 CSR Dashboard

CSR Dashboard should show:

- New leads
- Draft quotations
- Sent to client
- Client approved
- Pending revisions
- Quick buttons for Create Lead, Add Client, Create Quotation

### 11.2 Inventory Dashboard

Inventory Dashboard should show:

- Total stock in
- Total stock out
- Available stock
- Low stock alerts
- CSR approved jobs
- Pending purchase orders
- Pending vendor receipts
- Field service assignments
- Material reconciliations
- Stock value

### 11.3 Finance Dashboard

Finance Dashboard should show:

- Billing approved queue
- Draft invoices
- Saved invoices
- Monthly summaries
- Pending payments
- Paid invoices
- Total billing amount

Dashboards should not be used for heavy data entry. They should guide the user to the correct page.

## 12. UI / UX Requirements

The UI should be professional and easy.

Rules:

- Separate pages for separate tasks.
- No overloaded tables with too many mixed responsibilities.
- Every table row should be clickable or have clear actions.
- Buttons should be named by business action, not technical action.
- Use clear empty states.
- Use confirmation dialogs for destructive actions.
- Use status badges.
- Show next action on every record.
- Show success/error messages in plain language.
- Search and filters should be local to the module.
- Super Admin can see all workspaces.
- Role users only see their own workspace.

## 13. Security And Access Rules

Access should be role-based.

- CSR can create leads, clients and quotations.
- Inventory can manage stock, PO, dispatch and returns.
- Finance can create invoices and summaries.
- Super Admin can access all modules.
- Employee users see only employee self-service.

Security requirements:

- Protected routes.
- Backend permission checks.
- No hidden frontend-only security.
- JWT authentication.
- Audit logs for important actions.
- Idempotency for create actions.
- Validation on frontend and backend.
- No invoice or quotation creation without required fields.

## 14. Lead Demo Script

This is the clean demo journey for office review.

### Demo Part 1: CSR Creates Request

1. Login as Super Admin or CSR.
2. Open CSR / CRM Service.
3. Open Sales Leads.
4. Create a lead for a client.
5. Open Clients.
6. Confirm client exists or add new client.
7. Open Create Quotation.
8. Select client.
9. Add products from dropdown.
10. Confirm prices auto-fill.
11. Add manual purchase-required item if needed.
12. Save quotation.
13. Open Quotations Gallery.
14. Confirm quotation appears.

### Demo Part 2: Client Approval

1. Open quotation detail.
2. Click Send to Client.
3. Copy/open approval link.
4. Client reviews quotation.
5. Client approves.
6. Confirm approval token/receipt is created.
7. Confirm job moves to inventory queue.

### Demo Part 3: Inventory Action

1. Login as Inventory Officer or Super Admin.
2. Open Inventory Dashboard.
3. Open Approved Job Queue.
4. Open the approved client job.
5. Assign available stock.
6. Select serial/IMEI where needed.
7. Create PO for missing items if required.
8. Receive vendor stock.
9. Create field service dispatch.
10. Mark stock as given to installer.

### Demo Part 4: Installer Return

1. Open Field Reconciliation.
2. Select dispatch.
3. Mark used items.
4. Mark returned items.
5. Add field purchases if any.
6. Submit reconciliation.
7. Confirm stock movement ledger updates.

### Demo Part 5: CRM Billing Approval

1. Open Billing Approval.
2. Review final used/returned item summary.
3. Confirm billable items.
4. Approve for billing.

### Demo Part 6: Finance Invoice

1. Login as Finance Officer or Super Admin.
2. Open Finance Dashboard.
3. Open Invoice Builder from approved billing record.
4. Confirm client auto-loads correctly.
5. Confirm invoice rows match approved quotation and reconciled installer work.
6. Confirm prices and totals are correct.
7. Add manual row if needed.
8. Preview invoice.
9. Save draft invoice.
10. Print or save PDF.

### Demo Part 7: Monthly Summary

1. Open Client Billing & Summaries.
2. Select client.
3. Select month.
4. Select saved invoices.
5. Select summary type.
6. Generate summary.
7. Confirm selected invoices collapse into one client summary.

## 15. Current Implementation Alignment Checklist

Use this checklist to compare the current app against the required flow.

- CSR pages are separate.
- Client list is clickable.
- Lead pipeline is separate.
- Quotation creation saves correctly.
- Quotation appears in list after saving.
- Product selection auto-fills price.
- Quotation send-to-client creates approval link.
- Client approval creates inventory job only once.
- Inventory dashboard shows live stock numbers.
- Approved job queue shows client-approved jobs.
- Stock assignment is separated from dashboard.
- Purchase Orders has date, vendor, items and status.
- Vendor receipt updates stock.
- Field service dispatch records materials issued.
- Installer return adjusts used/returned stock.
- Billing approval is separate.
- Invoice builder loads correct client/job only.
- Invoice does not show stale rows.
- Invoice total is correct.
- Invoice save is idempotent.
- Monthly summary groups selected invoices by client.
- Role access works for CSR, Inventory, Finance and Super Admin.

## 16. Future Integrations

These can be implemented after the base flow is stable.

- Automated email sending for quotation, invoice and summary.
- OCR/scan import for purchase templates or vendor documents.
- Installer mobile app.
- Barcode scanner hardware integration.
- Exact official final summary template.
- Payment gateway or bank reconciliation integration.
- Advanced reporting dashboard.

## 17. Final Rule For Development

The system should always follow this sequence:

```text
CSR creates request and quotation
-> Client approves
-> Inventory receives approved job
-> Inventory allocates/purchases stock
-> Inventory gives stock to installer
-> Field team reconciles unused material
-> CRM approves billing
-> Finance generates invoice
-> Finance generates client summary
```

Any implementation that skips this sequence, mixes pages together, or creates invoices from stale/default data does not match the required flow.

