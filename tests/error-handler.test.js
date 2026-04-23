import { describe, it, expect } from 'vitest';

// Logic under test (mirroring server.js)
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = status === 500
        ? 'Internal Server Error'
        : (err.message || 'An unexpected error occurred');

    res.status(status).json({ error: message });
};

describe('Global Error Handler Logic', () => {
    it('should mask 500 error messages', () => {
        const res = {
            status: (code) => {
                expect(code).toBe(500);
                return res;
            },
            json: (data) => {
                expect(data.error).toBe('Internal Server Error');
                expect(data.error).not.toContain('Sensitive');
            }
        };
        const err = new Error('Sensitive data');
        errorHandler(err, {}, res, () => {});
    });

    it('should preserve 400 error messages', () => {
        const res = {
            status: (code) => {
                expect(code).toBe(400);
                return res;
            },
            json: (data) => {
                expect(data.error).toBe('Bad request');
            }
        };
        const err = new Error('Bad request');
        err.status = 400;
        errorHandler(err, {}, res, () => {});
    });
});
