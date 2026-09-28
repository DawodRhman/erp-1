import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./apiClient";
import { useAuthStore } from "../store/useAuthStore";

describe("apiClient auth errors", () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.defaults.adapter = originalAdapter;
    useAuthStore.setState({
      user: {
        email: "new.employee@example.com",
        role: "employee",
        role_name: "employee",
        must_change_password: true,
      },
      token: "new-employee-token",
      permissions: [],
      isAuthenticated: true,
      activeRole: "employee",
    });
  });

  it("keeps the session when backend requires password change", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    apiClient.defaults.adapter = async (config) => {
      return Promise.reject({
        config,
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
      });
    };

    await expect(apiClient.get("/auth/session")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.must_change_password).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("does not attach a stale bearer token to login requests", async () => {
    let authorizationHeader: unknown;
    apiClient.defaults.adapter = async (config) => {
      authorizationHeader = config.headers?.Authorization;
      return {
        config,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };

    await apiClient.post("/auth/login", {
      email: "superadmin@esspl.com.pk",
      password: "SuperAdmin@123!",
    });

    expect(authorizationHeader).toBeUndefined();
  });

  it("keeps the current page/session when a data endpoint returns a normal 403", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    useAuthStore.setState({
      user: {
        email: "hr.manager@example.com",
        role: "hr_manager",
        role_name: "hr_manager",
      },
      token: "hr-manager-token",
      permissions: ["view_dashboard"],
      isAuthenticated: true,
      activeRole: "hr_manager",
    });

    apiClient.defaults.adapter = async (config) => {
      return Promise.reject({
        config,
        response: {
          status: 403,
          data: {
            success: false,
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: "Forbidden for this resource.",
            },
          },
        },
      });
    };

    await expect(apiClient.get("/dashboard/metrics")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().activeRole).toBe("hr_manager");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Permission denied",
      expect.objectContaining({
        error: expect.objectContaining({ code: "INSUFFICIENT_PERMISSIONS" }),
      }),
    );
  });
});
