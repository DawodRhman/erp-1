import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Launchpad from "./Launchpad";

const authMock = vi.hoisted(() => ({ activeRole: "hr_manager" }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ activeRole: authMock.activeRole }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderLaunchpad(role = "hr_manager") {
  authMock.activeRole = role;
  return render(
    <MemoryRouter>
      <Launchpad />
    </MemoryRouter>,
  );
}

describe("Launchpad", () => {
  it("shows launchable modules for hr_manager roles", () => {
    renderLaunchpad("hr_manager");

    expect(screen.getByText("HR Dashboard")).toBeTruthy();
    expect(screen.getByText("Attendance")).toBeTruthy();
    expect(screen.getByText("Employees")).toBeTruthy();
    expect(screen.getByText("Penalty Workflow")).toBeTruthy();
  });

  it("shows launchable modules for hr_executive roles", () => {
    renderLaunchpad("hr_executive");

    expect(screen.getByText("Attendance")).toBeTruthy();
    expect(screen.getByText("Employees")).toBeTruthy();
    expect(screen.getByText("Announcements")).toBeTruthy();
  });

  it("shows every operational workspace for super admin", () => {
    renderLaunchpad("super_admin");

    expect(screen.getByText("Client & Commercial")).toBeTruthy();
    expect(screen.getByText("Inventory Logistics")).toBeTruthy();
    expect(screen.getByText("Invoice Builder")).toBeTruthy();
    expect(screen.getByText("Finance & Client Billing")).toBeTruthy();
    expect(screen.getByText("Matrix Operations")).toBeTruthy();
  });
});
