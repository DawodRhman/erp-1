import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate, validateQuery } from './validate.js';

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

describe('validate', () => {
  it('adds stable field names to validation details for frontend field mapping', () => {
    const middleware = validate(
      z.object({
        personalInfo: z.object({
          date_of_birth: z.string().min(4, 'Date of birth is mandatory.'),
        }),
      })
    );
    const req = { body: { personalInfo: { date_of_birth: '' } } };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details: [
          expect.objectContaining({
            field: 'date_of_birth',
            path: ['personalInfo', 'date_of_birth'],
            message: 'Date of birth is mandatory.',
          }),
        ],
      },
    });
  });
});
