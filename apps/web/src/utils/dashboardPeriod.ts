export type DashboardPeriod = "daily" | "weekly" | "monthly";

export const dashboardPeriodOptions: Array<{ value: DashboardPeriod; label: string; detail: string }> = [
  { value: "daily", label: "Daily", detail: "Today" },
  { value: "weekly", label: "Weekly", detail: "Last 7 days" },
  { value: "monthly", label: "Monthly", detail: "This month" },
];

export function dashboardPeriodLabel(period: DashboardPeriod) {
  return dashboardPeriodOptions.find((option) => option.value === period)?.detail || "This month";
}

export function dashboardPeriodRange(period: DashboardPeriod, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") start.setDate(start.getDate() - 6);
  if (period === "monthly") start.setDate(1);
  return { start, end };
}

export function isWithinDashboardPeriod(value: unknown, period: DashboardPeriod, now = new Date()) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  const range = dashboardPeriodRange(period, now);
  return date >= range.start && date <= range.end;
}
