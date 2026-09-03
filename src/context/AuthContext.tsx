import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useAuthStore, User as ZustandUser } from "../store/useAuthStore";
import {
  apiClient,
  clearServerSessionSilently,
  isMustChangePasswordError,
} from "../services/apiClient";

export interface User {
  username: string;
  name?: string;
  role:
    | "super_admin"
    | "head_hr"
    | "branch_hr"
    | "department_hr"
    | "department_head"
    | "hr_manager"
    | "hr_executive"
    | "csr_officer"
    | "inventory_officer"
    | "finance_officer"
    | "inv_fin_admin"
    | "employee";
  employeeId?: string;
  branch?: string | null;
  departments?: string[];
  mustChangePassword?: boolean;
}

export type LoginResult =
  | { ok: true; mustChangePassword?: boolean }
  | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  activeRole:
    | "super_admin"
    | "head_hr"
    | "branch_hr"
    | "department_hr"
    | "department_head"
    | "hr_manager"
    | "hr_executive"
    | "csr_officer"
    | "inventory_officer"
    | "finance_officer"
    | "inv_fin_admin"
    | "employee";
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  switchRole: (
    role:
      | "super_admin"
      | "head_hr"
      | "branch_hr"
      | "department_hr"
      | "department_head"
      | "hr_manager"
      | "hr_executive"
      | "csr_officer"
      | "inventory_officer"
      | "finance_officer"
      | "inv_fin_admin"
      | "employee",
  ) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_DEBUG = import.meta.env.DEV;
const TAB_SESSION_KEY = "ems_tab_session_active";

function authLog(...args: unknown[]) {
  if (AUTH_DEBUG) console.log("[EMS Auth]", ...args);
}

function hasActiveTabSession() {
  try {
    return sessionStorage.getItem(TAB_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function markActiveTabSession() {
  try {
    sessionStorage.setItem(TAB_SESSION_KEY, "true");
  } catch {
    // Storage may be unavailable in strict browser modes; auth still works in memory.
  }
}

function clearActiveTabSession() {
  try {
    sessionStorage.removeItem(TAB_SESSION_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

// Ensure the user role maps correctly to the expected types
export function mapRole(backendRole: string = ""): User["role"] {
  const normalized = backendRole.toLowerCase().trim();
  const normalizedKey = normalized.replace(/\s+/g, "_");
  if (
    normalizedKey === "super_admin" ||
    normalizedKey === "superadmin" ||
    normalizedKey === "admin"
  )
    return "super_admin";
  if (normalizedKey === "head_hr" || normalizedKey === "headoffice_hr")
    return "head_hr";
  if (normalizedKey === "branch_hr") return "branch_hr";
  if (normalizedKey === "department_head") return "department_head";
  if (
    normalizedKey === "department_hr" ||
    normalizedKey === "dept_hr"
  )
    return "department_hr";
  if (normalizedKey === "hr_manager" || normalizedKey === "hr")
    return "hr_manager";
  if (normalizedKey === "hr_executive") return "hr_executive";
  if (normalizedKey === "csr_officer" || normalizedKey === "csr") return "csr_officer";
  if (normalizedKey === "inventory_officer") return "inventory_officer";
  if (normalizedKey === "finance_officer") return "finance_officer";
  if (normalizedKey === "inv_fin_admin" || normalizedKey === "inventory_finance_admin")
    return "inv_fin_admin";
  return "employee";
}

function resolveEmployeeId(data: any, fallback?: string) {
  return (
    data?.employee_id ||
    data?.employeeId ||
    data?.emp_id ||
    data?.id ||
    data?.employee?.employee_id ||
    data?.employee?.employeeId ||
    data?.employee?.emp_id ||
    fallback
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user: zUser,
    activeRole: zActiveRole,
    setAuth,
    setPermissions,
    setMustChangePassword,
    logout: zLogout,
  } = useAuthStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Keep F5/browser refresh stable inside the same tab, but do not restore a
    // stale shared browser login when the app is opened in a fresh tab/session.
    if (!hasActiveTabSession()) {
      zLogout();
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    try {
      authLog("POST /auth/login", { email: email.trim() });
      useAuthStore.getState().logout();
      await clearServerSessionSilently();

      const res = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      if (res.data?.success) {
        const loginData = res.data.data || res.data;
        const token = loginData.token;
        const udata = loginData.user || {};
        let roleName = udata.role_name || udata.role || "employee";
        const mustChangePassword = !!udata.must_change_password;

        setAuth(
          {
            email: udata.email || email.trim(),
            role: roleName,
            role_name: roleName,
            employee_id: resolveEmployeeId(udata),
            must_change_password: mustChangePassword,
          },
          token,
        );

        // A first-login employee may be blocked from all endpoints except
        // change-password until the temporary password is replaced.
        if (!mustChangePassword) {
          try {
            const permsRes = await apiClient.get("/auth/permissions");
            if (permsRes.data?.success) {
              const permData = permsRes.data.data || {};
              roleName = permData.role_name || roleName;
              setPermissions(permData.permissions || []);
            }
          } catch (e) {
            authLog("Failed to load permissions after login", e);
          }
        }

        setAuth(
          {
            email: udata.email || email.trim(),
            role: roleName,
            role_name: roleName,
            employee_id: resolveEmployeeId(udata),
            must_change_password: mustChangePassword,
          },
          token,
        );

        setMustChangePassword(mustChangePassword);
        markActiveTabSession();

        return { ok: true, mustChangePassword };
      } else {
        return { ok: false, error: "Login failed" };
      }
    } catch (e: any) {
      if (isMustChangePasswordError(e)) {
        setAuth({
          email: email.trim(),
          role: "employee",
          role_name: "employee",
          must_change_password: true,
        });
        setMustChangePassword(true);
        markActiveTabSession();
        return { ok: true, mustChangePassword: true };
      }
      authLog("login exception", e);
      const errorMsg =
        e.response?.data?.error?.message ||
        e.response?.data?.message ||
        "Login failed";
      return { ok: false, error: errorMsg };
    }
  };

  const logout = () => {
    clearActiveTabSession();
    zLogout();
    clearServerSessionSilently();
  };

  const switchRole = (role: User["role"]) => {
    useAuthStore.getState().setActiveRole(role);
  };

  // Map Zustand user to the Legacy User object shape expected by UI
  let legacyUser: User | null = null;
  if (zUser) {
    legacyUser = {
      username: zUser.email,
      name: (zUser as any).name || zUser.email,
      role: mapRole(zUser.role_name || zUser.role),
      employeeId: zUser.employee_id || zUser.id,
      mustChangePassword: zUser.must_change_password,
    };
  }

  return (
    <AuthContext.Provider
      value={{
        user: legacyUser,
        activeRole: mapRole(zActiveRole),
        loading,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
