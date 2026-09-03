import { describe, expect, it } from 'vitest';
import { getDashboardPeriodRange, isWithinDashboardPeriod, normalizeDashboardPeriod } from './dashboardPeriod.js';

describe('dashboard period helpers', () => {
  const now = new Date('2026-08-28T12:00:00+05:00');

  it('normalizes unsupported periods to monthly', () => {
    expect(normalizeDashboardPeriod('daily')).toBe('daily');
    expect(normalizeDashboardPeriod('something-else')).toBe('monthly');
  });

  it('creates an inclusive seven-day weekly range', () => {
    const range = getDashboardPeriodRange('weekly', now);
    expect(range.start.getDate()).toBe(22);
    expect(isWithinDashboardPeriod('2026-08-22T00:00:00+05:00', range)).toBe(true);
    expect(isWithinDashboardPeriod('2026-08-21T23:59:59+05:00', range)).toBe(false);
  });

  it('starts monthly ranges on the first day', () => {
    const range = getDashboardPeriodRange('monthly', now);
    expect(range.start.getDate()).toBe(1);
    expect(isWithinDashboardPeriod('2026-08-01T00:00:00+05:00', range)).toBe(true);
  });
});
