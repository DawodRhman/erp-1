import { useAuthStore } from "../store/useAuthStore";
import {
  canPerformAction,
  getCurrentRole,
  normalizeRole,
  type Action,
  type Role,
} from "../utils/rbac";

export function useRbac() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const roleName = user?.role_name || user?.role;

  const role: Role = getCurrentRole(roleName);
  const can = (action: Action) =>
    canPerformAction(roleName, action, permissions);

  return { role, roleName, can, normalizeRole };
}
