import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeSidebar from "./EmployeeSidebar";
import { apiClient } from "../../services/apiClient";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "employee@example.com",
      role: "employee",
      employeeId: "EMP123",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function renderEmployeeSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EmployeeSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EmployeeSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the sidebar menu visible while employee details are loading", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}) as any);

    renderEmployeeSidebar();

    expect(screen.getByText("Self Service")).toBeTruthy();
    expect(screen.getByText("My Dashboard")).toBeTruthy();
    expect(screen.getByText("My Profile")).toBeTruthy();
    expect(screen.getByText("employee@example.com")).toBeTruthy();
  });
});
