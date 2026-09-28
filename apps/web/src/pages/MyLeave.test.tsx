import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyLeave from "./MyLeave";
import { apiClient } from "../services/apiClient";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { employeeId: "EMP061" } }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderMyLeave() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyLeave />
    </QueryClientProvider>,
  );
}

describe("MyLeave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/leave-requests/balances/mine") {
        return Promise.resolve({
          data: { data: [{ leave_type_id: "annual", leave_type_name: "Annual Leave", balance: 12, used: 2, remaining: 10 }] },
        });
      }
      return Promise.resolve({
        data: {
          data: [
            {
              id: "leave-1",
              leave_type_name: "Annual Leave",
              start_date: "2026-06-01",
              end_date: "2026-06-01",
              review_note: "Not enough balance",
              status: "rejected",
              created_at: "2026-05-30",
            },
          ],
        },
      });
    });
  });

  it("shows leave type, calculated days, and rejection reason", async () => {
    renderMyLeave();

    expect(await screen.findAllByText("Annual Leave")).toHaveLength(2);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("Not enough balance")).toBeTruthy();
  });
});
