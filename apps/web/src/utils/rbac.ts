/**
 * Centralized Role-Based Access Control (RBAC) utilities.
 * Combines static role→action map with API permission strings from /auth/permissions.
 */

export type Role =
  | "super_admin"
  | "finance_manager"
  | "hr_executive"
  | "procurement_manager"
  | "tech_lead"
  | "sales_manager"
  | "it_manager"
  | "hr_manager"
  | "department_head"
  | "ceo"
  | "swe_manager"
  | "operations_manager"
  | "employee";

export type Action =
  | "view_all_employees"
  | "create_employee"
  | "edit_employee"
  | "delete_employee"
  | "resend_credentials"
  | "view_employee_attachments"
  | "upload_employee_attachments"
  | "view_own_profile"
  | "access_dashboard"
  | "access_attendance"
  | "access_leave"
  | "access_penalties"
  | "access_calendar"
  | "access_notifications";

/** Maps UI actions to backend permission keys when available. */
export const ACTION_PERMISSION_MAP: Partial<Record<Action, string>> = {
  view_all_employees: "employees:read",
  create_employee: "employees:write",
  edit_employee: "employees:write",
  delete_employee: "employees:write",
  resend_credentials: "employees:write",
  view_employee_attachments: "employee_attachments:read",
  upload_employee_attachments: "employee_attachments:upload",
  access_dashboard: "dashboard:read",
  access_attendance: "attendance:read",
  access_leave: "leave:read",
  access_penalties: "penalties:read",
  access_calendar: "calendar:read",
  access_notifications: "notifications:read",
};

const rolePermissions: Record<Role, Action[]> = {
  super_admin: [
    "view_all_employees",
    "create_employee",
    "edit_employee",
    "delete_employee",
    "resend_credentials",
    "view_employee_attachments",
    "upload_employee_attachments",
    "view_own_profile",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  hr_manager: [
    "view_all_employees",
    "create_employee",
    "edit_employee",
    "resend_credentials",
    "view_employee_attachments",
    "upload_employee_attachments",
    "view_own_profile",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  hr_executive: [
    "view_all_employees",
    "view_employee_attachments",
    "upload_employee_attachments",
    "view_own_profile",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  finance_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  procurement_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  tech_lead: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  sales_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  it_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  swe_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  operations_manager: [
    "view_all_employees",
    "edit_employee",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  department_head: [
    "view_all_employees",
    "view_own_profile",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  ceo: [
    "view_all_employees",
    "view_employee_attachments",
    "access_dashboard",
    "access_attendance",
    "access_leave",
    "access_penalties",
    "access_calendar",
    "access_notifications",
  ],
  employee: ["view_own_profile", "access_dashboard"],
};

const KNOWN_ROLES = new Set<string>(Object.keys(rolePermissions));

/** Normalize backend / legacy role names to a known RBAC role. */
export function normalizeRole(roleName?: string | null): Role {
  const raw = (roleName || "employee").toLowerCase().trim().replace(/\s+/g, "_");

  if (raw === "superadmin" || raw === "admin") return "super_admin";
  if (
    raw === "head_hr" ||
    raw === "headoffice_hr" ||
    raw === "branch_hr" ||
    raw === "department_hr" ||
    raw === "dept_hr" ||
    raw === "hr"
  ) {
    return "hr_manager";
  }

  if (KNOWN_ROLES.has(raw)) return raw as Role;
  return "employee";
}

export function hasPermission(role: Role, action: Action): boolean {
  const perms = rolePermissions[role] ?? rolePermissions.employee;
  return perms.includes(action);
}

/**
 * Check permission using API permissions first, then static role map.
 */
export function canPerformAction(
  roleName: string | null | undefined,
  action: Action,
  apiPermissions?: string[],
): boolean {
  const role = normalizeRole(roleName);
  if (role === "super_admin") return true;

  const permKey = ACTION_PERMISSION_MAP[action];
  if (permKey && apiPermissions?.includes(permKey)) return true;

  return hasPermission(role, action);
}

export function getCurrentRole(roleName?: string | null): Role {
  return normalizeRole(roleName);
}
