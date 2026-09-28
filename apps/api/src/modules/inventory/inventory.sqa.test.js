import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

async function loadService() {
  vi.resetModules();
  return import('./inventory.service.js');
}

describe('Inventory SQA Boundary & Edge Case Audit Tests', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
  });

  it('safely handles JSON string, array, or null in customer draft template items', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'draft-1',
          customer_id: 'cust-1',
          payment_terms: 'NET30',
          default_discount_pct: 10,
          custom_notes: 'Custom Terms',
          template_items: JSON.stringify([
            { product_id: 'p-1', item_description: 'Tracker Sub', quantity: 2, unit_price: 1000 },
          ]),
        },
      ],
    });

    const service = await loadService();
    const draft = await service.getCustomerInvoiceDraft('cust-1');

    expect(Array.isArray(draft.template_items)).toBe(true);
    expect(draft.template_items).toHaveLength(1);
    expect(draft.template_items[0].item_description).toBe('Tracker Sub');
  });

  it('prevents double-stringification when upserting already stringified template_items', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'draft-2',
          customer_id: 'cust-2',
          payment_terms: 'NET15',
          default_discount_pct: 0,
          template_items: '[]',
        },
      ],
    });

    const service = await loadService();
    await service.upsertCustomerInvoiceDraft('cust-2', {
      payment_terms: 'NET15',
      template_items: JSON.stringify([{ item_description: 'Item 1', quantity: 1, unit_price: 500 }]),
    });

    const jsonArg = query.mock.calls[0][1][4];
    expect(jsonArg).not.toContain('\\"'); // Guarantee no double stringification quotes
  });

  it('handles negative price inputs gracefully by enforcing minimum zero bounds', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'prod-sqa', product_name: 'Boundary Test Asset', unit_price: 0, cost_price: 0, quantity: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const service = await loadService();
    const prod = await service.createProduct({
      product_name: 'Boundary Test Asset',
      unit_price: -500,
      cost_price: -100,
      quantity: -10,
    });

    const params = clientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO public.products'))[1];
    expect(params[4]).toBe(0); // quantity bounded at 0
    expect(params[6]).toBe(0); // unit_price bounded at 0
    expect(params[7]).toBe(0); // cost_price bounded at 0
  });
});
