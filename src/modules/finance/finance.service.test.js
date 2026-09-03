import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

async function loadService() {
  vi.resetModules();
  return import('./finance.service.js');
}

describe('finance service zero-value protection', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
  });

  it('blocks issuing a zero-value billing adjustment', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          id: 'invoice-1',
          invoice_number: 'INV-2026-0001',
          status: 'DRAFT',
          dispatch_id: null,
          total_amount: 0,
          subtotal: 0,
          tax_amount: 0,
          notes: JSON.stringify({ source: 'installer_returns' }),
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    await expect(service.approveBillingApproval('invoice-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ZERO_VALUE_INVOICE',
    });

    expect(query).toHaveBeenCalledTimes(2);
  });
});
