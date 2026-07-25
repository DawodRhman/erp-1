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

describe('inventory service', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
  });

  it('fetches inventory summary metrics correctly', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ total_products: 10, low_stock_count: 2, total_inventory_value: 50000 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_serials: 25, available_serials: 15, allocated_serials: 5, installed_serials: 4, damaged_serials: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_pos: 8, total_invoices: 12, pending_installations: 3, active_complaints: 1 }],
      });

    const service = await loadService();
    const summary = await service.getInventorySummary();

    expect(summary).toEqual({
      total_products: 10,
      low_stock_count: 2,
      total_inventory_value: 50000,
      total_serials: 25,
      available_serials: 15,
      allocated_serials: 5,
      installed_serials: 4,
      damaged_serials: 1,
      total_pos: 8,
      total_invoices: 12,
      pending_installations: 3,
      active_complaints: 1,
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('lists categories ordered by category name', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 'cat-1', category_name: 'Electronics', product_count: 5 },
        { id: 'cat-2', category_name: 'GPS Trackers', product_count: 3 },
      ],
    });

    const service = await loadService();
    const categories = await service.getCategories();

    expect(categories).toHaveLength(2);
    expect(categories[0].category_name).toBe('Electronics');
    expect(query.mock.calls[0][0]).toContain('ORDER BY ic.category_name ASC');
  });

  it('validates product creation input and normalizes product type', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'prod-1',
          product_name: 'Tracker GT-300',
          product_type: 'ASSET',
          tracking_type: 'SERIAL',
          quantity: 10,
          min_stock_level: 2,
          unit_price: 150.00,
        },
      ],
    });

    const service = await loadService();
    const product = await service.createProduct({
      product_name: 'Tracker GT-300',
      product_type: 'asset',
      tracking_type: 'serial',
      quantity: 10,
      min_stock_level: 2,
      unit_price: 150.00,
    });

    expect(product.product_name).toBe('Tracker GT-300');
    expect(query.mock.calls[0][1][2]).toBe('ASSET');
    expect(query.mock.calls[0][1][3]).toBe('SERIAL');
  });

  it('throws validation error when creating product without product_name', async () => {
    const service = await loadService();
    await expect(service.createProduct({})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('applies filters when querying products', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    await service.getProducts({
      search: 'tracker',
      product_type: 'ASSET',
      stock_status: 'low_stock',
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('p.product_name ILIKE');
    expect(sql).toContain('p.product_type =');
    expect(sql).toContain('p.quantity <= p.min_stock_level');
    expect(params).toContain('%tracker%');
    expect(params).toContain('ASSET');
  });
});
