import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Leave from "./Leave";
import { apiClient } from "../services/apiClient";

vi.mock("../context/DataContext", () => ({
  useData: () => ({ employees: [], leaveTypes: [] }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ activeRole: "hr_manager", user: { role: "hr_manager" } }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

function renderLeave() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Leave />
    </QueryClientProvider>,
  );
}

describe("Leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/leave-requests/balances/summary") return Promise.resolve({ data: { data: [] } });
      if (url === "/leave-requests/balances") return Promise.resolve({ data: { data: [] } });
      if (url === "/config/departments") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: "leave-1",
              employee_id: "EMP016",
              employee_name: "Kamran Rafiq",
              leave_type: "Annual Leave",
              start_date: "2026-03-13T19:00:00.000Z",
              end_date: "2026-03-18T19:00:00.000Z",
              reason: "Family commitment",
              status: "approved",
              reviewed_by_name: "Ayesha Khan",
              created_at: "2026-03-01T09:00:00.000Z",
            },
          ],
        },
      });
    });
  });

  it("formats leave dates and removes unsupported amount columns", async () => {
    renderLeave();
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(await screen.findByText("Kamran Rafiq")).toBeTruthy();
    expect(screen.getByText("13 Mar 2026")).toBeTruthy();
    expect(screen.getByText("18 Mar 2026")).toBeTruthy();
    expect(screen.getByText("Ayesha Khan")).toBeTruthy();
    expect(screen.queryByText(/requested amount/i)).toBeNull();
    expect(screen.queryByText(/approved amount/i)).toBeNull();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });
  });

  it("does not expose a raw reviewer UUID when no readable approver name is returned", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/leave-requests/balances/summary") return Promise.resolve({ data: { data: [] } });
      if (url === "/leave-requests/balances") return Promise.resolve({ data: { data: [] } });
      if (url === "/config/departments") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: "leave-1",
              employee_id: "EMP016",
              employee_name: "Kamran Rafiq",
              leave_type: "Annual Leave",
              start_date: "2026-03-13",
              end_date: "2026-03-18",
              reason: "Family commitment",
              status: "approved",
              reviewed_by: "39b623d6-e275-45d2-b340-92a4df5f8d1f",
              created_at: "2026-03-01",
            },
          ],
        },
      });
    });

    renderLeave();
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(await screen.findByText("Kamran Rafiq")).toBeTruthy();
    expect(screen.getByText("Not provided")).toBeTruthy();
    expect(screen.queryByText("39b623d6-e275-45d2-b340-92a4df5f8d1f")).toBeNull();
  });

  it("splits approved leaves into upcoming and completed sections", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/leave-requests/balances/summary") return Promise.resolve({ data: { data: [] } });
      if (url === "/leave-requests/balances") return Promise.resolve({ data: { data: [] } });
      if (url === "/config/departments") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({
        data: {
          data: [
            {
              id: "leave-completed",
              employee_id: "EMP016",
              employee_name: "Kamran Rafiq",
              leave_type: "Annual Leave",
              start_date: "2026-03-13",
              end_date: "2026-03-18",
              reason: "Family commitment",
              status: "approved",
              reviewed_by_name: "Ayesha Khan",
              created_at: "2026-03-01",
            },
            {
              id: "leave-upcoming",
              employee_id: "EMP017",
              employee_name: "Sana Malik",
              leave_type: "Casual Leave",
              start_date: "2035-07-10",
              end_date: "2035-07-12",
              reason: "Travel",
              status: "approved",
              reviewed_by_name: "Ayesha Khan",
              created_at: "2026-06-01",
            },
          ],
        },
      });
    });

    renderLeave();
    fireEvent.click(screen.getByRole("button", { name: "Approved" }));

    expect(await screen.findByRole("button", { name: /Upcoming/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Completed/i })).toBeTruthy();
    expect(screen.getByText("Sana Malik")).toBeTruthy();
    expect(screen.queryByText("Kamran Rafiq")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Completed/i }));

    expect(screen.getByText("Kamran Rafiq")).toBeTruthy();
    expect(screen.queryByText("Sana Malik")).toBeNull();
  });

  it("shows one compact balance row per employee and expands leave-type details", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/leave-requests/balances/summary") {
        return Promise.resolve({
          data: {
            data: [
              {
                employee_id: "EMP001",
                employee_name: "Adeel Rahman",
                department_name: "Administration",
                profile_photo_url: null,
                total_allocated: 22,
                total_used: 6,
                total_remaining: 16,
                leave_types: [
                  { leave_type_id: "annual", leave_type_name: "Annual Leave", allocated: 12, used: 4, remaining: 8 },
                  { leave_type_id: "sick", leave_type_name: "Sick Leave", allocated: 10, used: 2, remaining: 8 },
                ],
              },
            ],
          },
        });
      }
      if (url === "/config/departments") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderLeave();

    expect(await screen.findByText("Adeel Rahman")).toBeTruthy();
    expect(screen.getByText("EMP001")).toBeTruthy();
    expect(screen.getByText("Administration")).toBeTruthy();
    expect(screen.getByText("6 used of 22")).toBeTruthy();
    expect(screen.getByText("16 remaining")).toBeTruthy();
    expect(screen.queryByText("Annual Leave")).toBeNull();

    fireEvent.click(screen.getByText("Adeel Rahman"));

    expect(screen.getByText("Annual Leave")).toBeTruthy();
    expect(screen.getByText("Sick Leave")).toBeTruthy();
  });
});
