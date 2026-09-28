import { describe, expect, it } from "vitest";
import {
  canPerformAction,
  hasPermission,
  normalizeRole,
} from "./rbac";

describe("rbac", () => {
  it("normalizes legacy HR roles to hr_manager", () => {
    expect(normalizeRole("head_hr")).toBe("hr_manager");
    expect(normalizeRole("branch_hr")).toBe("hr_manager");
  });

  it("grants super_admin all static actions", () => {
    expect(hasPermission("super_admin", "delete_employee")).toBe(true);
  });

  it("denies employee create_employee in static map", () => {
    expect(hasPermission("employee", "create_employee")).toBe(false);
  });

  it("hr_executive cannot create employees in static map", () => {
    expect(hasPermission("hr_executive", "create_employee")).toBe(false);
  });

  it("uses API permission when present", () => {
    expect(
      canPerformAction("employee", "create_employee", ["employees:write"]),
    ).toBe(true);
  });

  it("hr_manager can create via static map", () => {
    expect(canPerformAction("hr_manager", "create_employee", [])).toBe(true);
  });

  it("keeps department_head scoped and without employee creation access", () => {
    expect(normalizeRole("department_head")).toBe("department_head");
    expect(canPerformAction("department_head", "view_all_employees", [])).toBe(true);
    expect(canPerformAction("department_head", "view_all_employees", ["employees:department_read"])).toBe(true);
    expect(canPerformAction("department_head", "create_employee", [])).toBe(false);
    expect(canPerformAction("department_head", "edit_employee", ["employees:department_read"])).toBe(false);
    expect(canPerformAction("department_head", "resend_credentials", ["employees:department_read"])).toBe(false);
  });

  it("keeps ceo read-only", () => {
    expect(normalizeRole("ceo")).toBe("ceo");
    expect(canPerformAction("ceo", "view_all_employees", [])).toBe(true);
    expect(canPerformAction("ceo", "edit_employee", [])).toBe(false);
    expect(canPerformAction("ceo", "create_employee", [])).toBe(false);
    expect(canPerformAction("ceo", "resend_credentials", [])).toBe(false);
  });
});
