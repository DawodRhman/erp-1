import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

async function loadService() {
  vi.resetModules();
  return import('./matrix.service.js');
}

describe('Matrix SQA Boundary & Edge Case Audit Tests', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
  });

  it('handles null OTP code safely without throwing TypeError', async () => {
    const clientQuery = vi.fn();
    connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    });

    clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: 'tck-null', otp_code: null, assigned_technician_id: 'tech-1' }],
      });

    const service = await loadService();
    await expect(
      service.verifyCustomerOTPHandshake({
        ticket_id: 'tck-null',
        input_otp: '1234',
      })
    ).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    });
  });

  it('validates required fields when creating sales lead', async () => {
    const service = await loadService();
    await expect(service.createSalesLead({ title: '   ' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });
});
