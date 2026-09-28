import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../context/ToastContext";

const mocks = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));

vi.mock("./crmApi", () => ({ crmApi: mocks }));

import ClientForm from "./ClientForm";

function openForm() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/crm/clients/new"]}>
        <Routes>
          <Route path="/crm/clients/new" element={<ClientForm />} />
          <Route path="/crm/clients/:id" element={<div>Saved client profile</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listCustomers.mockResolvedValue([]);
  mocks.createCustomer.mockResolvedValue({ id: "customer-1", customer_name: "Ali Khan" });
});

afterEach(cleanup);

describe("ClientForm", () => {
  it("uses professional organization fields by default", () => {
    openForm();
    expect((screen.getByLabelText(/Client Category/) as HTMLSelectElement).value).toBe("ORGANIZATION");
    expect(screen.getByLabelText(/Organization Type/)).not.toBeNull();
    expect(screen.getByLabelText(/Client \/ Trading Name/)).not.toBeNull();
    expect(screen.getByLabelText(/Legal Registered Name/)).not.toBeNull();
  });

  it("saves an individual with services and without duplicate company fields", async () => {
    openForm();
    fireEvent.change(screen.getByLabelText(/Client Category/), { target: { value: "INDIVIDUAL" } });

    expect(screen.queryByLabelText(/Organization Type/)).toBeNull();
    expect(screen.queryByLabelText(/Legal Registered Name/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "Ali Khan" } });
    fireEvent.click(screen.getByLabelText("Security & Surveillance Systems"));
    fireEvent.click(screen.getByLabelText("HR & Staffing Services"));
    fireEvent.change(screen.getByLabelText(/Service Requirement \/ Scope/), { target: { value: "Home CCTV installation" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Client" }));

    await waitFor(() => expect(mocks.createCustomer).toHaveBeenCalledTimes(1));
    expect(mocks.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      customer_name: "Ali Khan",
      customer_category: "INDIVIDUAL",
      customer_type: "Individual",
      company_name: "",
      organization_type: "",
      service_categories: ["SECURITY_SYSTEMS", "HR_STAFFING"],
      service_description: "Home CCTV installation",
    }));
    expect(await screen.findByText("Saved client profile")).not.toBeNull();
  });
});
