import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

let activeRole = "hr_manager";
const logout = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "manager@example.com",
      role: activeRole,
    },
    activeRole,
    logout,
  }),
}));

vi.mock("../../context/DataContext", () => ({
  useData: () => ({
    allAttendanceToday: [],
    leaveRequests: [],
  }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToastContext: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("../../images/logo.png", () => ({
  default: "logo.png",
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    activeRole = "hr_manager";
    logout.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows employee self-service links for role users who are also employees", () => {
    renderSidebar();

    expect(screen.getByText("My Workspace")).toBeTruthy();
    expect(screen.getByText("My Dashboard")).toBeTruthy();
    expect(screen.getByText("My Attendance")).toBeTruthy();
    expect(screen.getByText("My Leave")).toBeTruthy();
    expect(screen.getByText("My Penalties")).toBeTruthy();
    expect(screen.getByText("My Profile")).toBeTruthy();
  });

  it("does not show employee self-service links for super admin", () => {
    activeRole = "super_admin";

    renderSidebar();

    expect(screen.queryByText("My Workspace")).toBeNull();
  });

  it("keeps personal workspace links disabled for service-only finance users", () => {
    activeRole = "finance_officer";

    renderSidebar();

    expect(screen.getByText("My Workspace")).toBeTruthy();
    expect(screen.getByText("Personal EMS tools are disabled for this service login.")).toBeTruthy();
    expect(screen.getByText("My Dashboard").closest("a")).toBeNull();
    expect(screen.getByText("Finance Dashboard").closest("a")?.getAttribute("href")).toBe("/finance-dashboard");
  });

  it("shows only inventory service links for inventory officers", () => {
    activeRole = "inventory_officer";

    renderSidebar();

    expect(screen.getByText("Inventory Dashboard").closest("a")?.getAttribute("href")).toBe("/inventory-dashboard");
    expect(screen.getByText("Product & Service Catalog").closest("a")?.getAttribute("href")).toBe("/inventory/products");
    expect(screen.queryByText("Finance Dashboard")).toBeNull();
    expect(screen.queryByText("Client & Commercial")).toBeNull();
  });

  it("shows inventory and finance links for combined admins without the HR dashboard route", () => {
    activeRole = "inv_fin_admin";

    const { container } = renderSidebar();

    expect(screen.getByText("Inventory Dashboard").closest("a")?.getAttribute("href")).toBe("/inventory-dashboard");
    expect(screen.getByText("Billing Approvals").closest("a")?.getAttribute("href")).toBe("/finance/billing-approvals");
    expect(screen.getByText("Invoices").closest("a")?.getAttribute("href")).toBe("/finance/invoices");
    expect(screen.getByText("Summaries").closest("a")?.getAttribute("href")).toBe("/finance/summaries");
    expect(container.querySelectorAll('a[href="/dashboard"]')).toHaveLength(0);
  });

  it("shows a Logout action and confirms before ending the session", () => {
    renderSidebar();

    fireEvent.click(screen.getByText("Logout"));

    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to logout?");
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("manager@example.com")).toBeNull();
  });

  it("only marks Manage Announcements active on its route", () => {
    activeRole = "department_head";

    render(
      <MemoryRouter initialEntries={["/announcements/manage"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    const announcements = screen.getByText("Announcements").closest("a");
    const manage = screen.getByText("Manage Announcements").closest("a");

    expect(announcements?.className).not.toContain("active");
    expect(manage?.className).toContain("active");
  });
});
