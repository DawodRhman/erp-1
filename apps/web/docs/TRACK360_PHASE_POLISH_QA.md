# TRACK360 Phase Polish QA

## Scope Completed In This Pass

- Inventory stock ledger is now a first-class backend and frontend feature.
- Stock ledger captures stock-in, stock-out, return and transfer-style history from inventory actions.
- Purchase orders now create stock-in ledger rows when product quantities increase.
- Inventory invoices now create stock-out ledger rows when product quantities decrease.
- Serial / IMEI create, status update and delete now create audit-ready ledger rows.
- Field dispatch and field reconciliation now add ledger history for installer issue, installed item and returned stock.
- Inventory page now has a dedicated Stock Ledger tab with search, movement type filter, KPI cards and movement table.
- Inventory dashboard now shows latest stock ledger activity in addition to stock health, serials, POs and receipts.
- Inventory dispatch API routes now require explicit inventory read/write permissions.
- Topbar route naming now includes Inventory Dashboard.
- Backend service tests cover inventory movement listing and stock-in ledger creation.

## Explicitly Deferred

- Installer app / separate installer workspace.
- Final client summary document format.
- OCR / scan-to-inventory automation.
- Email sending automation.

## Role And Module Boundary

- Super Admin: full ERP, CSR/CRM, inventory, invoicing, finance, matrix and HR access.
- Inventory Officer: inventory dashboard/logistics and matrix inventory operations only.
- Finance Officer: accounts/finance and finance settlement areas only.
- Inventory + Finance Admin: combined inventory and finance workspace access.
- Employee roles: employee self-service areas only unless a backend permission grants more.

## Verification Commands

Backend:

```bash
cd C:\Users\HP\Documents\Codex\2026-07-27\erp-review\erp-1
npm test -- --run src/modules/inventory/inventory.service.test.js
```

Frontend:

```bash
cd C:\Users\HP\Documents\Codex\2026-07-27\erp-review\erp-2
npm run build
```

## Manual Demo Flow To Check

1. Login as Super Admin.
2. Open Inventory Dashboard and confirm stock KPIs plus latest ledger panel.
3. Open Inventory Logistics.
4. Create a purchase order and refresh Stock Ledger; a Stock In row should appear.
5. Update a serial status and refresh Stock Ledger; a serial status movement should appear.
6. Create or open an inventory invoice and refresh Stock Ledger; a Stock Out row should appear.
7. Try inventory routes with a non-inventory role; protected API routes should deny access.

