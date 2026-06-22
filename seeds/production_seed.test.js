import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_DEPARTMENTS,
  PRODUCTION_DESIGNATIONS_BY_DEPARTMENT,
  PRODUCTION_SUPER_ADMIN,
} from './production_seed.js';

describe('production seed contract', () => {
  it('keeps production seed minimal and non-demo', () => {
    expect(PRODUCTION_DEPARTMENTS.map((department) => department.name)).toEqual([
      'Information Technology',
      'Human Resources',
      'Sales',
    ]);

    const allDesignations = Object.values(PRODUCTION_DESIGNATIONS_BY_DEPARTMENT).flat();
    expect(allDesignations.length).toBeGreaterThan(0);
    expect(allDesignations.length).toBeLessThanOrEqual(12);
    expect(allDesignations).not.toContain('Chief Revenue Officer');
  });

  it('defines one explicit super admin bootstrap account', () => {
    expect(PRODUCTION_SUPER_ADMIN).toEqual({
      email: 'superadmin@esspl.com.pk',
      password: 'SuperAdmin@123!',
    });
  });
});
