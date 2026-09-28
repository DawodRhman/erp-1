import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BranchHRDashboard from "./BranchHRDashboard";

vi.mock("./Attendance", () => ({
  default: () => <div>Real attendance workflow</div>,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ activeRole: "super_admin" }),
}));

describe("BranchHRDashboard", () => {
  it("uses the real attendance workflow instead of prototype branch records", () => {
    render(<BranchHRDashboard />);

    expect(screen.getByText("Real attendance workflow")).toBeTruthy();
    expect(screen.queryByText("Clifton Branch")).toBeNull();
  });
});
