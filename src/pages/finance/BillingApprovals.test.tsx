import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BillingApprovals } from "./FinancePages";

const getBillingApprovals = vi.hoisted(() => vi.fn());

vi.mock("../../services/financeService", async () => {
  const actual = await vi.importActual<any>("../../services/financeService");
  return {
    ...actual,
    financeService: {
      ...actual.financeService,
      getBillingApprovals,
    },
  };
});

describe("BillingApprovals", () => {
  it("loads all billing handoffs by default and keeps issued history visible", async () => {
    getBillingApprovals.mockResolvedValueOnce([
      {
        id: "invoice-1",
        invoice_number: "INV-2026-0012",
        token_number: "TKN-2026-0006",
        order_number: "ORD-2026-0028",
        customer_name: "QA Client",
        status: "ISSUED",
        approval_status: "APPROVED",
        submitted_date: "2026-08-27T06:53:23.485Z",
        bill_breakdown: {
          installed_items: [],
          returned_items: [],
          extra_items: [],
          original_total: 170000,
          returns_deducted: 85000,
          extra_added: 0,
          final_amount: 100300,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <BillingApprovals />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBillingApprovals).toHaveBeenCalledWith({ status: undefined, search: "" }));
    expect(await screen.findByText("TKN-2026-0006")).toBeTruthy();
    expect(screen.getByText("APPROVED")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View/i })).toBeTruthy();
  });

  it("labels a zero adjustment as no charge instead of showing a payable zero invoice", async () => {
    getBillingApprovals.mockResolvedValueOnce([
      {
        id: "invoice-zero",
        invoice_number: "INV-2026-0013",
        token_number: "TKN-2026-0007",
        customer_name: "QA Client",
        status: "VOIDED",
        approval_status: "NO_CHARGE",
        bill_breakdown: {
          installed_items: [],
          returned_items: [{ product_name: "Camera", quantity: 1, amount: 85000 }],
          extra_items: [],
          original_total: 85000,
          returns_deducted: 85000,
          extra_added: 0,
          final_amount: 0,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <BillingApprovals />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No charge")).toBeTruthy();
    expect(screen.getByText("NO CHARGE")).toBeTruthy();
  });
});
