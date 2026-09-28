import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InventoryDashboard from "./InventoryDashboard";
import { inventoryApi } from "../services/inventoryService";

vi.mock("../services/inventoryService", () => ({
  inventoryApi: {
    getSummary: vi.fn(),
    getProducts: vi.fn(),
    getWorkQueue: vi.fn(),
    getPurchaseOrders: vi.fn(),
    getDispatches: vi.fn(),
    getReturnRequests: vi.fn(),
  },
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("InventoryDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryApi.getSummary).mockResolvedValue({
      total_products: 2,
      low_stock_count: 1,
      total_inventory_value: 5000,
      total_serials: 1,
      available_serials: 1,
      allocated_serials: 0,
      installed_serials: 0,
      damaged_serials: 0,
      total_pos: 1,
      total_invoices: 0,
      pending_installations: 1,
      active_complaints: 0,
      pending_incoming_orders: 1,
      active_tokens: 1,
      active_dispatches: 1,
      pending_returns: 1,
      period_movement_count: 3,
    });
    vi.mocked(inventoryApi.getProducts).mockResolvedValue([
      { id: "product-1", product_name: "Access Controller", product_type: "ASSET", tracking_type: "SERIAL", quantity: 0, min_stock_level: 2, unit_price: 1000, cost_price: 0 },
    ]);
    vi.mocked(inventoryApi.getWorkQueue).mockResolvedValue([
      { id: "quote-1", order_id: "order-1", order_number: "ORD-2026-0001", quotation_number: "QT-2026-0001", customer_name: "Habib Bank Limited", status: "AWAITING_STOCK", stock_status: "AWAITING_STOCK", total_amount: 1000, item_count: 1, total_requested_qty: 1, created_at: "2026-09-24" },
    ]);
    vi.mocked(inventoryApi.getPurchaseOrders).mockResolvedValue([
      { id: "po-1", po_number: "PO-2026-0001", vendor_name: "Approved Supplier", status: "ORDERED", total_amount: 1000, order_date: "2026-09-24", expected_delivery_date: "2026-09-30" },
    ]);
    vi.mocked(inventoryApi.getDispatches).mockResolvedValue([
      { id: "dispatch-1", dispatch_number: "DSP-2026-0001", customer_name: "Engro Corporation", installer_name: "Field Technician", status: "IN_PROGRESS" },
    ]);
    vi.mocked(inventoryApi.getReturnRequests).mockResolvedValue([
      { id: "return-1", return_request_no: "RTN-2026-0001", dispatch_number: "DSP-2026-0001", status: "PENDING" },
    ]);
  });

  it("presents the complete Inventory fulfilment workflow with live next actions", async () => {
    render(<MemoryRouter><InventoryDashboard /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Operations Control Centre" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("ORD-2026-0001")).toBeTruthy());
    expect(screen.getByText("Stock Movement")).toBeTruthy();
    expect(screen.getByText("Fulfilment Workload")).toBeTruthy();
    expect(screen.getByText("Inventory Health")).toBeTruthy();
    expect(screen.getByText("Replenishment Watchlist")).toBeTruthy();
    expect(screen.getByText("Recent Dispatches")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open Procurement/i }).getAttribute("href")).toBe("/inventory/purchasing");
    expect(inventoryApi.getSummary).toHaveBeenCalledWith({ period: "monthly" });
  });
});
