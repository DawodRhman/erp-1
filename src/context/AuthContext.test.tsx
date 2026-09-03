import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, mapRole, useAuth } from "./AuthContext";
import { useAuthStore } from "../store/useAuthStore";

const apiGetMock = vi.fn();
const apiPostMock = vi.fn();
const clearServerSessionSilentlyMock = vi.fn();

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
  clearServerSessionSilently: (...args: unknown[]) =>
    clearServerSessionSilentlyMock(...args),
  isMustChangePasswordError: (error: any) =>
    error?.response?.data?.error?.code === "MUST_CHANGE_PASSWORD",
}));

function AuthProbe() {
  const { user, activeRole, loading, login } = useAuth();
  if (loading) return <div>Loading</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.username || "no-user"}</div>
      <div data-testid="user-role">{user?.role || "no-role"}</div>
      <div data-testid="active-role">{activeRole}</div>
      <div data-testid="employee-id">{user?.employeeId || "no-employee-id"}</div>
      <div data-testid="must-change">
        {user?.mustChangePassword ? "yes" : "no"}
      </div>
      <button
        type="button"
        onClick={() => {
          login("new.employee@example.com", "Temp@123!");
        }}
      >
        Login
      </button>
    </div>
  );
}

describe("AuthProvider login-first session policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    clearServerSessionSilentlyMock.mockResolvedValue(undefined);
    useAuthStore.setState({
      user: {
        email: "new.employee@example.com",
        role: "employee",
        role_name: "employee",
        employee_id: "EMP001",
        must_change_password: true,
      },
      token: "new-employee-token",
      permissions: [],
      isAuthenticated: true,
      activeRole: "employee",
    });
  });

  it("starts every fresh app load from a logged-out login-first state", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("no-user");
    });
    expect(screen.getByTestId("user-role").textContent).toBe("no-role");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(clearServerSessionSilentlyMock).not.toHaveBeenCalled();
    expect(apiGetMock).not.toHaveBeenCalledWith("/auth/session");
  });

  it("preserves the logged-in user during an F5 refresh in the same browser tab", async () => {
    sessionStorage.setItem("ems_tab_session_active", "true");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe(
        "new.employee@example.com",
      );
    });
    expect(screen.getByTestId("user-role").textContent).toBe("employee");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("treats a login MUST_CHANGE_PASSWORD response as a forced password-change session", async () => {
    useAuthStore.setState({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      activeRole: "employee",
    });
    apiGetMock.mockResolvedValue({ data: { success: false } });
    const { fireEvent } = await import("@testing-library/react");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login")).toBeTruthy();
    });

    const loginError = {
      response: {
        status: 403,
        data: {
          success: false,
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password must be changed before continuing.",
          },
        },
      },
    };
    apiPostMock.mockRejectedValueOnce(loginError);

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.must_change_password).toBe(true);
    });
    expect(sessionStorage.getItem("ems_tab_session_active")).toBe("true");
  });

  it("clears any stale browser session before posting new login credentials", async () => {
    useAuthStore.setState({
      user: null,
      token: "stale-token",
      permissions: [],
      isAuthenticated: false,
      activeRole: "employee",
    });
    apiGetMock.mockResolvedValue({ data: { success: false } });
    apiPostMock.mockResolvedValueOnce({
      data: {
        success: true,
        token: "fresh-token",
        user: {
          email: "superadmin@esspl.com.pk",
          role_name: "super_admin",
          must_change_password: false,
        },
      },
    });
    const { fireEvent } = await import("@testing-library/react");

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/auth/login", {
        email: "new.employee@example.com",
        password: "Temp@123!",
      });
    });
    expect(clearServerSessionSilentlyMock).toHaveBeenCalledTimes(1);
    expect(clearServerSessionSilentlyMock.mock.invocationCallOrder[0]).toBeLessThan(
      apiPostMock.mock.invocationCallOrder[0],
    );
    expect(sessionStorage.getItem("ems_tab_session_active")).toBe("true");
  });
});

describe("mapRole", () => {
  it("preserves backend HR roles used by demo accounts", () => {
    expect(mapRole("hr_manager")).toBe("hr_manager");
    expect(mapRole("HR Manager")).toBe("hr_manager");
    expect(mapRole("hr_executive")).toBe("hr_executive");
    expect(mapRole("HR Executive")).toBe("hr_executive");
    expect(mapRole("department_head")).toBe("department_head");
    expect(mapRole("Department Head")).toBe("department_head");
    expect(mapRole("super_admin")).toBe("super_admin");
  });
});
