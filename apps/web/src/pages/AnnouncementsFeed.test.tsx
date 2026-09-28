import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AnnouncementsFeed from "./AnnouncementsFeed";

const markReadMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useAnnouncements", () => ({
  useAnnouncements: () => ({
    announcements: [
      {
        id: "announcement-1",
        title: "Policy Update",
        body: "Read the updated leave policy.",
        is_active: true,
        is_read: false,
        created_at: "2026-06-16T00:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
    markRead: {
      mutate: markReadMock,
      isPending: false,
    },
  }),
}));

describe("AnnouncementsFeed", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the feed read-only without a management action", () => {
    render(
      <MemoryRouter>
        <AnnouncementsFeed />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Manage Announcements")).toBeNull();
    expect(screen.queryByText("Add Announcement")).toBeNull();
  });

  it("marks an unread announcement as read", () => {
    render(
      <MemoryRouter>
        <AnnouncementsFeed />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(markReadMock).toHaveBeenCalledWith("announcement-1");
  });
});
