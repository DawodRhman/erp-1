import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyAttendance from "./MyAttendance";
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

function renderMyAttendance() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyAttendance />
    </QueryClientProvider>,
  );
}

describe("MyAttendance", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          date: "2026-06-16",
          rows: [
            {
              attendance_id: "attendance-1",
              employee_id: "EMP061",
              date: "2026-06-16",
              check_in: "09:20:00",
              check_out: "18:00:00",
              status: "late",
              ack: false,
            },
          ],
        },
      },
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: "correction-1" } },
    });
  });

  it("submits attendance correction requests to the backend", async () => {
    renderMyAttendance();

    expect(await screen.findByText("16 Jun 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /request correction/i }));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    const reasonInput = screen.getByPlaceholderText(/explain why correction is needed/i);

    fireEvent.change(dateInput, {
      target: { value: "2026-06-16" },
    });
    fireEvent.change(timeInput, {
      target: { value: "09:00" },
    });
    fireEvent.change(reasonInput, {
      target: { value: "Biometric device was delayed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/attendance/corrections", {
        date: "2026-06-16",
        requested_check_in: "09:00:00",
        requested_check_out: null,
        reason: "Biometric device was delayed",
      });
    });
  });
});
