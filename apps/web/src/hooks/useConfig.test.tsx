import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../services/apiClient";
import { createConfigHook, useDepartments } from "./useConfig";

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function DepartmentProbe() {
  const { data } = useDepartments();
  return (
    <div>
      {data.map((department: any) => (
        <span key={department.id}>
          {department.department_name || department.name}
        </span>
      ))}
    </div>
  );
}

const useManagedDepartments = createConfigHook<any>("departments", { includeInactive: true });

function ManagedDepartmentProbe() {
  const { data } = useManagedDepartments();
  return (
    <div>
      {data.map((department: any) => (
        <span key={department.id}>
          {department.department_name || department.name}
        </span>
      ))}
    </div>
  );
}

describe("useConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes config list responses where data is the array", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "dept-1",
            department_code: "IT",
            department_name: "Information Technology",
          },
        ],
      },
    });

    renderWithClient(<DepartmentProbe />);

    expect(await screen.findByText("Information Technology")).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith("/config/departments");
  });

  it("requests inactive records only when a management hook asks for them", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "dept-3",
            department_code: "OLD",
            department_name: "Legacy Department",
            is_active: false,
          },
        ],
      },
    });

    renderWithClient(<ManagedDepartmentProbe />);

    expect(await screen.findByText("Legacy Department")).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith("/config/departments", {
      params: { include_inactive: true },
    });
  });

  it("normalizes nested config list responses defensively", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          departments: [
            {
              id: "dept-2",
              department_code: "DEV",
              department_name: "Software Development",
            },
          ],
        },
      },
    });

    renderWithClient(<DepartmentProbe />);

    await waitFor(() => {
      expect(screen.getByText("Software Development")).toBeTruthy();
    });
  });
});
