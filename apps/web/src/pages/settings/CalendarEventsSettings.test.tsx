import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarEventsSettings from "./CalendarEventsSettings";
import { apiClient } from "../../services/apiClient";

const showToast = vi.fn();

vi.mock("../../context/ToastContext", () => ({
  useToastContext: () => ({ showToast }),
}));

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CalendarEventsSettings />
    </QueryClientProvider>,
  );
}

describe("CalendarEventsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showToast.mockClear();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/calendar-events") return Promise.resolve({ data: { data: [] } });
      if (url === "/config/departments") {
        return Promise.resolve({
          data: {
            data: [
              { id: "11111111-1111-4111-8111-111111111111", department_name: "IT" },
              { id: "22222222-2222-4222-8222-222222222222", department_name: "HR" },
              { id: "33333333-3333-4333-8333-333333333333", department_name: "Finance" },
            ],
          },
        });
      }
      if (url === "/config/designations") {
        return Promise.resolve({
          data: {
            data: [
              { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Frontend Engineer", department_id: "11111111-1111-4111-8111-111111111111" },
              { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "HR Officer", department_id: "22222222-2222-4222-8222-222222222222" },
              { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", title: "Finance Manager", department_id: "33333333-3333-4333-8333-333333333333" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "event-1" } } });
  });

  it("saves calendar events with multiple department and designation chips", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Add Event"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Team training" } });
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-06-18" } });

    fireEvent.click(await screen.findByRole("button", { name: "IT" }));
    fireEvent.click(screen.getByRole("button", { name: "HR" }));
    fireEvent.click(await screen.findByRole("button", { name: "HR Officer" }));

    fireEvent.click(screen.getByText("Save Event"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/calendar-events", expect.objectContaining({
        start_date: "2026-06-15",
        end_date: "2026-06-18",
        target_department_ids: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        target_designation_ids: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
      }));
    });
  });

  it("blocks saving when the calendar event end date is before the start date", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Add Event"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Bad range" } });
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-06-18" } });
    fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-06-15" } });
    fireEvent.click(screen.getByText("Save Event"));

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("To date cannot be before from date.", "error");
  });
});
