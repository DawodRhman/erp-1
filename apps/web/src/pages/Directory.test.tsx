import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Directory from "./Directory";
import { apiClient } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

const authMock = vi.hoisted(() => ({ activeRole: "super_admin" }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ activeRole: authMock.activeRole }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderDirectory(management = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Directory management={management} />
    </QueryClientProvider>,
  );
}

describe("Directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.activeRole = "super_admin";
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "super_admin" },
      permissions: [],
      activeRole: "super_admin",
      isAuthenticated: true,
    });
  });

  it("opens the add entry modal from the create button", async () => {
    renderDirectory(true);

    fireEvent.click(screen.getByRole("button", { name: /add entry/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /add directory entry/i })).toBeTruthy();
    });
  });

  it("hides management controls when the user can read but cannot write directory entries", async () => {
    authMock.activeRole = "hr_executive";
    useAuthStore.setState({
      user: { email: "hr@example.com", role: "hr_executive" },
      permissions: ["directory:read"],
      activeRole: "hr_executive",
      isAuthenticated: true,
    });
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "dir-2",
            type: "employee",
            name: "Rabia Aslam",
            email: "rabia.aslam.emp017@esspl.com.pk",
            phone_mobile: "+923001112233",
            department_name: "Human Resources",
            branch_name: "Head Office",
          },
        ],
      },
    });

    renderDirectory();

    expect(await screen.findByText("Rabia Aslam")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add entry/i })).toBeNull();
    expect(screen.queryByTitle("Edit")).toBeNull();
    expect(screen.queryByTitle("Delete")).toBeNull();
  });

  it("renders contact actions for WhatsApp and email", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "dir-3",
            type: "employee",
            name: "Kamran Rafiq",
            email: "kamran.rafiq.emp016@esspl.com.pk",
            phone_mobile: "+92 300 555 0101",
            role_title: "HR Manager",
            department_name: "Human Resources",
            branch_name: "Head Office",
          },
        ],
      },
    });

    renderDirectory();

    expect(await screen.findByText("Kamran Rafiq")).toBeTruthy();
    expect(screen.getByRole("link", { name: /message kamran rafiq on whatsapp/i }).getAttribute("href")).toBe(
      "https://wa.me/923005550101",
    );
    expect(screen.getByRole("link", { name: /email kamran rafiq/i }).getAttribute("href")).toBe(
      "mailto:kamran.rafiq.emp016@esspl.com.pk",
    );
  });

  it("renders employee directory as read-only self-service", async () => {
    authMock.activeRole = "employee";
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "dir-1",
            type: "department",
            name: "IT Support",
            contact: "111",
            isActive: true,
          },
        ],
      },
    });

    renderDirectory();

    expect(await screen.findByText("Company Directory")).toBeTruthy();
    expect(await screen.findByText("IT Support")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add entry/i })).toBeNull();
    expect(screen.queryByTitle("Edit")).toBeNull();
    expect(screen.queryByTitle("Delete")).toBeNull();
  });
});
