import { describe, expect, it } from "vitest";
import { dashboardPeriodLabel, dashboardPeriodRange, isWithinDashboardPeriod } from "./dashboardPeriod";

describe("dashboard period helpers", () => {
  const now = new Date("2026-08-28T12:00:00+05:00");

  it("returns user-facing period labels", () => {
    expect(dashboardPeriodLabel("daily")).toBe("Today");
    expect(dashboardPeriodLabel("weekly")).toBe("Last 7 days");
    expect(dashboardPeriodLabel("monthly")).toBe("This month");
  });

  it("creates a seven-day weekly range", () => {
    expect(dashboardPeriodRange("weekly", now).start.getDate()).toBe(22);
    expect(isWithinDashboardPeriod("2026-08-22T00:00:00+05:00", "weekly", now)).toBe(true);
    expect(isWithinDashboardPeriod("2026-08-21T23:59:59+05:00", "weekly", now)).toBe(false);
  });
});
