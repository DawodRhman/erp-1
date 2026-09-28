import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuditLog from "./AuditLog";

const useAuditLogsMock = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ activeRole: "super_admin" }),
}));

vi.mock("../hooks/useAuditLogs", () => ({
  useAuditLogs: (params: any) => useAuditLogsMock(params),
}));

describe("AuditLog", () => {
  beforeEach(() => {
    useAuditLogsMock.mockReset();
    useAuditLogsMock.mockReturnValue({
      logs: [
        {
          id: "log-1",
          timestamp: "2026-06-17T10:00:00.000Z",
          user: "Super Admin",
          role: "super_admin",
          action: "AUTH_LOGIN_SUCCESS",
          module: "auth",
          recordId: "EMP0001",
          summary: "auth login success in auth for EMP0001.",
          ip_address: "127.0.0.1",
          user_agent: "Vitest Browser",
          method: "POST",
          path: "/api/auth/login",
          request_id: "request-1",
          actor_user_id: "user-1",
          actor_employee_id: "EMP0001",
          actor_role_id: "role-super",
          actor_email: "superadmin@esspl.com.pk",
          meta: {
            actor_employee_id: "EMP0001",
            actor_email: "superadmin@esspl.com.pk",
          },
        },
      ],
      isLoading: false,
      error: null,
      page: 1,
      limit: 50,
      total: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("passes audit filters to the backend hook and clears them", () => {
    render(<AuditLog />);

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "login" } });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-06-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-06-17" } });
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "AUTH_LOGIN_SUCCESS" } });
    fireEvent.change(screen.getByLabelText("Module"), { target: { value: "auth" } });
    fireEvent.change(screen.getByLabelText("Actor Employee"), { target: { value: "EMP0001" } });
    fireEvent.change(screen.getByLabelText("Record ID"), { target: { value: "EMP0001" } });

    expect(useAuditLogsMock).toHaveBeenLastCalledWith({
      search: "login",
      action: "AUTH_LOGIN_SUCCESS",
      module: "auth",
      actor_employee_id: "EMP0001",
      entity_id: "EMP0001",
      date_from: "2026-06-01",
      date_to: "2026-06-17",
      limit: 50,
      page: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(useAuditLogsMock).toHaveBeenLastCalledWith({
      search: "",
      action: "",
      module: "",
      actor_employee_id: "",
      entity_id: "",
      date_from: "",
      date_to: "",
      limit: 50,
      page: 1,
    });
  });

  it("shows immutable audit identity details when a row is expanded", () => {
    render(<AuditLog />);

    fireEvent.click(screen.getAllByText("AUTH_LOGIN_SUCCESS")[1]);

    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Actor User ID:")).toBeTruthy();
    expect(screen.getAllByText("user-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EMP0001").length).toBeGreaterThan(0);
    expect(screen.getByText("User Agent:")).toBeTruthy();
    expect(screen.getByText("Vitest Browser")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });
});
