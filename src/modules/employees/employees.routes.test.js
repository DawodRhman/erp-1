import { describe, expect, it } from 'vitest';
import router from './employees.routes.js';

describe('employees finance route permissions', () => {
  it('allows salary readers or the employee themself to read finance history', () => {
    const financeLayer = router.stack.find((layer) => layer.route?.path === '/:employeeId/finance');
    const permissionMiddleware = financeLayer?.route?.stack
      ?.map((layer) => layer.handle)
      .find((handle) => handle.__perm);

    expect(permissionMiddleware?.__perm).toEqual({
      mode: 'any',
      keys: ['salary:read', 'employees:department_read', 'employees:self_read'],
    });
  });
});
