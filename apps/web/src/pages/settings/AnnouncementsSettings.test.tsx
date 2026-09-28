import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsSettings from "./AnnouncementsSettings";
import { apiClient } from "../../services/apiClient";

vi.mock("../../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
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
      <AnnouncementsSettings />
    </QueryClientProvider>,
  );
}

describe("AnnouncementsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/announcements") return Promise.resolve({ data: { data: [] } });
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
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: "announcement-1" } } });
  });

  it("saves multiple department and selected designation chips", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Add Announcement"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Policy update" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Please review the new policy." } });

    fireEvent.click(await screen.findByRole("button", { name: "IT" }));
    fireEvent.click(screen.getByRole("button", { name: "HR" }));

    expect(await screen.findByRole("button", { name: "Frontend Engineer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HR Officer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Finance Manager" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Frontend Engineer" }));
    fireEvent.click(screen.getByText("Save Announcement"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/announcements", expect.objectContaining({
        target_department_ids: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        target_designation_ids: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      }));
    });
  });

  it("saves announcement with an expiry date", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Add Announcement"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Short lived" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Expires tomorrow." } });
    fireEvent.change(screen.getByLabelText("Expiry Date"), { target: { value: "2026-06-05" } });
    fireEvent.click(screen.getByText("Save Announcement"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/announcements", expect.objectContaining({
        title: "Short lived",
        body: "Expires tomorrow.",
        expiry_date: "2026-06-05",
      }));
    });
  });
});
