import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnnouncements } from "./useAnnouncements";
import { apiClient } from "../services/apiClient";

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes backend announcement lists", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: "announcement-1",
            title: "Office timing",
            body: "Friday timing update",
            audience: "all",
            is_active: true,
          },
        ],
      },
    });

    const { result } = renderHook(() => useAnnouncements(), { wrapper });

    await waitFor(() => {
      expect(result.current.announcements).toHaveLength(1);
    });
    expect(apiClient.get).toHaveBeenCalledWith("/announcements", { params: {} });
    expect(result.current.announcements[0]).toMatchObject({
      id: "announcement-1",
      title: "Office timing",
      body: "Friday timing update",
      audience: "all",
      is_active: true,
    });
  });
});
