import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());
const recordActivityLog = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

vi.mock('../audit/audit.service.js', () => ({ recordActivityLog }));

async function loadService() {
  vi.resetModules();
  return import('./inventory.service.js');
}

describe('inventory service', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    recordActivityLog.mockReset();
    recordActivityLog.mockResolvedValue({ id: 'audit-1' });
  });

  it('fetches inventory summary metrics correctly', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ total_products: 10, total_stock_qty: 125, available_stock_qty: 90, low_stock_count: 2, total_inventory_value: 50000 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_serials: 25, available_serials: 15, allocated_serials: 5, installed_serials: 4, damaged_serials: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_pos: 8, total_invoices: 12, pending_installations: 3, active_complaints: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ approved_csr_jobs: 4, sent_csr_quotes: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [{ period_stock_in_qty: 30, period_stock_out_qty: 12, period_return_qty: 3, period_movement_count: 5 }],
      });

    const service = await loadService();
    const summary = await service.getInventorySummary();

    expect(summary).toEqual({
      total_products: 10,
      total_stock_qty: 125,
      available_stock_qty: 90,
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
      approved_csr_jobs: 4,
      sent_csr_quotes: 2,
      period_stock_in_qty: 30,
      period_stock_out_qty: 12,
      period_return_qty: 3,
      period_movement_count: 5,
      summary_period: "Monthly",
      period_start: expect.any(String),
      period_end: expect.any(String),
    });
    expect(query).toHaveBeenCalledTimes(5);
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

  it('creates a catalog product with a controlled initial stock receipt', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'prod-1', product_name: 'Tracker GT-300', product_type: 'ASSET', tracking_type: 'NONE', quantity: 10, min_stock_level: 2, unit_price: 150 }] })
      .mockResolvedValueOnce({ rows: [] });
    connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });
    query.mockResolvedValue({ rows: [] });

    const service = await loadService();
    const product = await service.createProduct({
      product_name: 'Tracker GT-300',
      product_type: 'asset',
      tracking_type: 'none',
      initial_quantity: 10,
      min_stock_level: 2,
      unit_price: 150.00,
      cost_price: 100,
    });

    expect(product.product_name).toBe('Tracker GT-300');
    const insertCall = clientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO public.products'));
    expect(insertCall[1][2]).toBe('ASSET');
    expect(insertCall[1][3]).toBe('NONE');
    expect(insertCall[1]).toContain(10);
  });

  it('builds a readable SKU from brand and model', async () => {
    const service = await loadService();
    expect(service.buildProductSku({ brand_make: 'Hikvision', model_no: 'DS-2CD2143G2-I' })).toBe('HIKVISION-DS-2CD2143G2-I');
    expect(service.buildProductSku({ product_name: 'Access Control Panel' })).toBe('PRD-ACCESS-CONTROL-PANEL');
  });

  it('throws validation error when creating product without product_name', async () => {
    const service = await loadService();
    await expect(service.createProduct({})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('stores validated Inventory workspace colors with operational settings', async () => {
    query.mockImplementationOnce(async (_sql, params) => ({ rows: [{ setting_value: params[1] }] }));

    const service = await loadService();
    const settings = await service.updateInventorySettings({
      default_min_stock_threshold: 8,
      low_stock_alert_email: 'warehouse@esspl.com.pk',
      theme_preset: 'ocean',
      primary_color: '#164e63',
      accent_color: '#0284c7',
      page_color: '#f0f9ff',
      surface_color: '#ffffff',
    }, 'user-1');

    expect(settings).toMatchObject({
      default_min_stock_threshold: 8,
      low_stock_alert_email: 'warehouse@esspl.com.pk',
      theme_preset: 'ocean',
      primary_color: '#164E63',
      accent_color: '#0284C7',
      page_color: '#F0F9FF',
      surface_color: '#FFFFFF',
    });
    expect(JSON.parse(query.mock.calls[0][1][1])).toMatchObject({ theme_preset: 'ocean', primary_color: '#164E63' });
  });

  it('falls back to the approved Inventory theme when custom colors are invalid', async () => {
    query.mockImplementationOnce(async (_sql, params) => ({ rows: [{ setting_value: params[1] }] }));

    const service = await loadService();
    const settings = await service.updateInventorySettings({
      default_min_stock_threshold: 5,
      theme_preset: 'unsupported',
      primary_color: 'navy',
      accent_color: '#12345',
      page_color: '',
      surface_color: '#GGGGGG',
    });

    expect(settings).toMatchObject({
      theme_preset: 'executive',
      primary_color: '#10234D',
      accent_color: '#0F766E',
      page_color: '#EEF5FF',
      surface_color: '#FFFFFF',
    });
  });

  it('builds the purchase-order list without referencing a missing total_price column', async () => {
    query.mockImplementation(async (sql, params = []) => {
      const statement = String(sql);
      if (statement.includes('information_schema.columns')) {
        const columnsByTable = {
          purchase_orders: ['id', 'po_number', 'status', 'order_date', 'expected_delivery_date', 'created_at', 'vendor_id', 'crm_order_id', 'quotation_id'],
          purchase_order_items: ['id', 'purchase_order_id', 'product_id', 'quotation_item_id', 'quantity', 'received_quantity', 'unit_price', 'remarks'],
          vendors: ['id', 'vendor_name'],
          quotations: ['id', 'quotation_number'],
        };
        return { rows: (columnsByTable[params[0]] || []).map((column_name) => ({ column_name })) };
      }
      return { rows: [] };
    });

    const service = await loadService();
    await service.getPurchaseOrders();

    const listCall = query.mock.calls.find(([sql]) => String(sql).includes('jsonb_agg'));
    expect(listCall).toBeTruthy();
    expect(String(listCall[0])).not.toContain('poi.total_price');
    expect(String(listCall[0])).toContain("COALESCE(poi.quantity, 1) * COALESCE(poi.unit_price, 0)");
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

  it('lists inventory movement ledger with search and movement filters', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ table_name: 'inventory_movements' }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'product_id' },
          { column_name: 'inventory_item_id' },
          { column_name: 'movement_type' },
          { column_name: 'quantity' },
          { column_name: 'reference_type' },
          { column_name: 'reference_id' },
          { column_name: 'notes' },
          { column_name: 'created_by' },
          { column_name: 'created_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'move-1', product_name: 'CCTV Camera', movement_type: 'STOCK_OUT', quantity: 2 }],
      });

    const service = await loadService();
    const movements = await service.getInventoryMovements({ search: 'camera', movement_type: 'stock_out' });

    const [sql, params] = query.mock.calls[2];
    expect(movements).toHaveLength(1);
    expect(sql).toContain('FROM public.inventory_movements im');
    expect(sql).toContain('im.movement_type =');
    expect(params).toContain('%camera%');
    expect(params).toContain('STOCK_OUT');
  });

  it('lists inventory movements when older ledger columns are missing', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ table_name: 'inventory_movements' }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'product_id' },
          { column_name: 'inventory_item_id' },
          { column_name: 'movement_type' },
          { column_name: 'remarks' },
          { column_name: 'moved_by' },
          { column_name: 'created_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'move-old-1', product_name: 'CCTV Camera', reference_type: 'Manual', notes: 'Inventory movement' }],
      });

    const service = await loadService();
    const movements = await service.getInventoryMovements({ search: 'camera' });

    const [sql] = query.mock.calls[2];
    expect(movements).toHaveLength(1);
    expect(sql).toContain("'Manual' AS reference_type");
    expect(sql).not.toContain('im.reference_type ILIKE');
    expect(sql).toContain('im.remarks ILIKE');
  });

  it('records a stock-in ledger entry when creating an inventory item', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'item-1', product_id: 'prod-1', current_status: 'AVAILABLE' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'move-1' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);
    query
      .mockResolvedValueOnce({ rows: [{ table_name: 'inventory_movements' }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'product_id' },
          { column_name: 'inventory_item_id' },
          { column_name: 'movement_type' },
          { column_name: 'quantity' },
          { column_name: 'reference_type' },
          { column_name: 'reference_id' },
          { column_name: 'notes' },
          { column_name: 'created_by' },
        ],
      });

    const service = await loadService();
    const item = await service.createInventoryItem({ product_id: 'prod-1', serial_number: 'SN-1' }, 'user-1');

    expect(item.id).toBe('item-1');
    expect(client.query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO public.inventory_movements'))).toBe(true);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('generates one token per incoming order and marks stocked orders as ready to dispatch', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // ensure token sequence
        .mockResolvedValueOnce({ rows: [] }) // drop not null
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            quotation_id: 'quote-1',
            customer_id: 'cust-1',
            token_number: null,
            status: 'PENDING_REVIEW',
            quotation_number: 'QT-2026-0001',
            total_amount: 11800,
            customer_name: 'Engro Corporation',
            item_count: 1,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // next token ensures sequence
        .mockResolvedValueOnce({ rows: [{ seq: 1 }] }) // next token
        .mockResolvedValueOnce({ rows: [{ total_items: 1, shortage_items: 0 }] }) // stock check
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            quotation_id: 'quote-1',
            token_number: 'TKN-2026-0001',
            status: 'STOCK_OK',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }), // COMMIT
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    const token = await service.generateOrderToken('order-1', 'user-1');

    expect(token.token_number).toBe('TKN-2026-0001');
    expect(token.status).toBe('STOCK_OK');
    expect(token.already_generated).toBe(false);
    expect(client.query.mock.calls.some((call) => String(call[0]).includes('status = $3'))).toBe(true);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('returns an existing token instead of creating a duplicate and refreshes stock status', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // ensure token sequence
        .mockResolvedValueOnce({ rows: [] }) // drop not null
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            quotation_id: 'quote-1',
            token_number: 'TKN-2026-0001',
            status: 'TOKEN_GENERATED',
            quotation_number: 'QT-2026-0001',
            total_amount: 11800,
            customer_name: 'Engro Corporation',
            item_count: 1,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ total_items: 1, shortage_items: 1 }] }) // stock check
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            quotation_id: 'quote-1',
            token_number: 'TKN-2026-0001',
            status: 'AWAITING_STOCK',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }), // COMMIT
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    const token = await service.generateOrderToken('order-1', 'user-1');

    expect(token.token_number).toBe('TKN-2026-0001');
    expect(token.status).toBe('AWAITING_STOCK');
    expect(token.already_generated).toBe(true);
    expect(client.query.mock.calls.some((call) => String(call[0]).includes("nextval('public.inventory_token_number_seq')"))).toBe(false);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates an individual client profile without duplicating a company name', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          'customer_name', 'company_name', 'customer_category', 'organization_type', 'customer_type',
          'service_categories', 'service_description', 'contact_person', 'email', 'phone', 'address',
        ].map((column_name) => ({ column_name })),
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'customer-1', customer_name: 'Ali Khan', company_name: null, customer_category: 'INDIVIDUAL',
          organization_type: null, service_categories: ['SECURITY_SYSTEMS'],
        }],
      });

    const service = await loadService();
    const customer = await service.createCustomer({
      customer_name: ' Ali Khan ',
      company_name: 'Must be ignored',
      customer_category: 'individual',
      organization_type: 'Corporate',
      service_categories: ['security_systems', 'SECURITY_SYSTEMS'],
      service_description: 'Home CCTV installation',
      email: ' Ali@example.com ',
      phone: '0300-1112233',
      address: 'Karachi',
    }, 'user-1');

    expect(customer.customer_category).toBe('INDIVIDUAL');
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('INSERT INTO public.customers');
    expect(params).toEqual([
      'Ali Khan', null, 'INDIVIDUAL', null, 'Individual', ['SECURITY_SYSTEMS'],
      'Home CCTV installation', null, 'ali@example.com', '0300-1112233', 'Karachi',
    ]);
    expect(recordActivityLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', action: 'CRM_CLIENT_CREATED', entityId: 'customer-1',
    }));
  });

  it('rejects an unsupported client category before querying the database', async () => {
    const service = await loadService();
    await expect(service.createCustomer({ customer_name: 'Invalid Client', customer_category: 'UNKNOWN' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    expect(query).not.toHaveBeenCalled();
    expect(recordActivityLog).not.toHaveBeenCalled();
  });

  it('does not store a legal company name when it duplicates the client display name', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          'customer_name', 'company_name', 'customer_category', 'organization_type', 'customer_type',
          'service_categories', 'service_description', 'contact_person', 'email', 'phone', 'address',
        ].map((column_name) => ({ column_name })),
      })
      .mockResolvedValueOnce({ rows: [{ id: 'customer-2', customer_name: 'Habib Bank Limited', company_name: null }] });

    const service = await loadService();
    await service.createCustomer({
      customer_name: 'Habib Bank Limited',
      company_name: 'habib bank limited',
      customer_category: 'ORGANIZATION',
      organization_type: 'BANK',
      service_categories: ['HR_STAFFING'],
    }, 'user-1');

    expect(query.mock.calls[1][1][1]).toBeNull();
    expect(query.mock.calls[1][1][3]).toBe('BANK');
  });
});
