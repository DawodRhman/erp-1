import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Calendar from "./Calendar";
import { apiClient } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../context/DataContext", () => ({
  useData: () => ({ employees: [] }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderCalendar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      activeRole: "employee",
    });
  });

  it("renders backend calendar events without a coming soon overlay", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: "1694d670-7649-48c0-9083-08de886b7f4e",
            type: "holiday",
            date: "2026-03-22T19:00:00.000Z",
            title: "Pakistan Day 2026",
          },
          {
            id: "8f7afd07-30c7-434d-8d1f-5f8fd4e718c9",
            type: "event",
            date: "2026-12-14T19:00:00.000Z",
            title: "Annual Performance Review 2026",
          },
        ],
      },
    });

    renderCalendar();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/calendar-events", { params: {} });
    });
    expect(await screen.findByText("Pakistan Day 2026")).toBeTruthy();
    expect(await screen.findByText("Annual Performance Review 2026")).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it("passes clean filter params to the calendar endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    renderCalendar();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/calendar-events", { params: {} });
    });

    fireEvent.change(screen.getByLabelText(/range/i), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText(/type/i), {
      target: { value: "holiday" },
    });
    fireEvent.change(screen.getByPlaceholderText(/search calendar/i), {
      target: { value: "eid" },
    });
    fireEvent.change(screen.getByLabelText(/sort/i), {
      target: { value: "date" },
    });
    fireEvent.change(screen.getByLabelText(/order/i), {
      target: { value: "desc" },
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith("/calendar-events", {
        params: {
          all: true,
          type: "holiday",
          search: "eid",
          sort: "date",
          order: "desc",
        },
      });
    });
  });

  it("keeps the calendar viewer read-only even when the user has write permission", async () => {
    useAuthStore.setState({
      user: {
        email: "hr@example.com",
        role: "hr_manager",
      },
      permissions: ["calendar:write"],
      isAuthenticated: true,
      activeRole: "hr_manager",
    });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [
          {
            id: "event-1",
            type: "holiday",
            date: "2026-03-22T19:00:00.000Z",
            title: "Pakistan Day 2026",
          },
        ],
      },
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderCalendar();

    expect(await screen.findByText("Pakistan Day 2026")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add event/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit pakistan day 2026/i })).toBeNull();
    expect(screen.getByText(/manage calendar events/i)).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
