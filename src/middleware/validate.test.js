import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateQuery } from './validate.js';

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('validateQuery', () => {
  it('stores parsed query data without assigning to getter-only req.query', () => {
    const req = {};
    Object.defineProperty(req, 'query', {
      get: () => ({ all: 'true' }),
    });

    const middleware = validateQuery(
      z.object({
        all: z.enum(['true', 'false']).transform((value) => value === 'true'),
      })
    );
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.validatedQuery).toEqual({ all: true });
    expect(res.status).not.toHaveBeenCalled();
  });
});
