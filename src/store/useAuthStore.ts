import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  canPerformAction,
  normalizeRole,
  type Action,
} from "../utils/rbac";
import { clearAuthToken, setAuthToken } from "../utils/authCookie";

export interface User {
  id?: string;
  employee_id?: string;
  email: string;
  role: string;
  role_name?: string;
  must_change_password?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  activeRole: string; // Used for UI simulation/testing if needed, but normally just user.role

  setAuth: (user: User, token?: string) => void;
  setPermissions: (permissions: string[]) => void;
  setMustChangePassword: (mustChange: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  can: (action: Action) => boolean;
  isRole: (role: string) => boolean;
  setActiveRole: (role: string) => void;
}

const tabAuthStorage = createJSONStorage(() => sessionStorage);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      activeRole: "employee", // default fallback

      setAuth: (user, token) => {
        if (token) setAuthToken(token);
        set((state) => ({
          user,
          token: token || state.token,
          isAuthenticated: true,
          activeRole: user.role_name || user.role || "employee",
        }));
      },

      setPermissions: (permissions) => {
        set({ permissions });
      },

      setMustChangePassword: (mustChange) => {
        set((state) => ({
          user: state.user
            ? { ...state.user, must_change_password: mustChange }
            : state.user,
        }));
      },

      logout: () => {
        clearAuthToken();
        set({
          user: null,
          token: null,
          permissions: [],
          isAuthenticated: false,
          activeRole: "employee",
        });
        localStorage.removeItem("ems_user");
        localStorage.removeItem("ems_token");
      },

      hasPermission: (permission) => {
        const { permissions, user } = get();
        const role = normalizeRole(user?.role_name || user?.role);
        if (role === "super_admin") return true;
        return permissions.includes(permission);
      },

      can: (action) => {
        const { permissions, user } = get();
        return canPerformAction(
          user?.role_name || user?.role,
          action,
          permissions,
        );
      },

      isRole: (role) => {
        const { user } = get();
        return user?.role === role || user?.role_name === role;
      },

      setActiveRole: (role) => {
        set({ activeRole: role });
      },
    }),
    {
      name: "auth-storage", // unique name
      storage: tabAuthStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        activeRole: state.activeRole,
      }), // Save these fields per browser tab, so parallel portal tabs do not overwrite each other.
    },
  ),
);
