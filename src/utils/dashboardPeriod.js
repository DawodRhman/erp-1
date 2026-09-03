const VALID_PERIODS = new Set(['daily', 'weekly', 'monthly']);

export function normalizeDashboardPeriod(value) {
  const period = String(value || 'monthly').toLowerCase();
  return VALID_PERIODS.has(period) ? period : 'monthly';
}

export function getDashboardPeriodRange(value, now = new Date()) {
  const period = normalizeDashboardPeriod(value);
  const end = new Date(now);
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);
  if (period === 'weekly') start.setDate(start.getDate() - 6);
  if (period === 'monthly') start.setDate(1);

  return { period, start, end };
}

export function isWithinDashboardPeriod(value, range) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
}
