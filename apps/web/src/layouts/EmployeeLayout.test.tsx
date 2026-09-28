import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeLayout from "./EmployeeLayout";

let activeRole = "hr_manager";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "manager@example.com",
      role: activeRole,
      employeeId: "EMP200",
    },
    activeRole,
  }),
}));

vi.mock("../components/layout/EmployeeSidebar", () => ({
  default: () => <aside>Self service navigation</aside>,
}));

vi.mock("../components/layout/Topbar", () => ({
  default: () => <header>Topbar</header>,
}));

function renderLayout(path = "/my-dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route path="/my-dashboard" element={<main>My employee dashboard</main>} />
        </Route>
        <Route path="/dashboard" element={<main>Role dashboard</main>} />
        <Route path="/launchpad" element={<main>Super admin launchpad</main>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EmployeeLayout", () => {
  beforeEach(() => {
    activeRole = "hr_manager";
  });

  it("allows non-super-admin role users to open their employee self-service dashboard", () => {
    renderLayout();

    expect(screen.getByText("My employee dashboard")).toBeTruthy();
    expect(screen.getByText("Self service navigation")).toBeTruthy();
  });

  it("keeps super admin out of employee self-service", () => {
    activeRole = "super_admin";

    renderLayout();

    expect(screen.getByText("Super admin launchpad")).toBeTruthy();
  });
});
