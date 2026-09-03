import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());
const recordInventoryMovement = vi.hoisted(() => vi.fn());
const createClientInvoiceFromDispatch = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

vi.mock('./inventory.service.js', () => ({
  recordInventoryMovement,
}));

vi.mock('../invoicing/invoicing.service.js', () => ({
  createClientInvoiceFromDispatch,
}));

async function loadService() {
  vi.resetModules();
  return import('./field-logistics.service.js');
}

describe('field logistics service', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    recordInventoryMovement.mockReset();
    createClientInvoiceFromDispatch.mockReset();
  });

  it('requires an installer before creating a dispatch', async () => {
    const service = await loadService();

    await expect(
      service.createDispatch({
        customer_id: 'customer-1',
        items: [],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(query).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it('generates dispatch numbers with the DSP-YYYY-XXXX format', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'dispatch-1', dispatch_number: 'DSP-2026-0008' }],
        })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    query.mockResolvedValueOnce({ rows: [{ total: 7 }] });
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    const dispatch = await service.createDispatch({
      customer_id: 'customer-1',
      installer_id: 'installer-1',
      items: [],
    });

    const insertCall = client.query.mock.calls.find((call) => String(call[0]).includes('INSERT INTO public.installer_field_dispatches'));
    expect(insertCall[1][0]).toMatch(/^DSP-\d{4}-0008$/);
    expect(insertCall[1][0]).not.toMatch(/^DSP-\d{6}-/);
    expect(dispatch.dispatch_number).toBe('DSP-2026-0008');
  });

  it('blocks dispatch creation when the tokenized order is still awaiting stock', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            token_number: 'TKN-2026-0001',
            status: 'AWAITING_STOCK',
            item_count: 2,
            shortage_items: 1,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    query.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    await expect(
      service.createDispatch({
        quotation_id: 'quote-1',
        customer_id: 'customer-1',
        installer_id: 'installer-1',
        items: [{ product_id: 'product-1', quantity_issued: 1 }],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'ORDER_NOT_STOCK_READY',
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('blocks a second dispatch for the same quotation', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-1',
            token_number: 'TKN-2026-0001',
            status: 'STOCK_OK',
            item_count: 1,
            shortage_items: 0,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', dispatch_number: 'DSP-2026-0001' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };

    query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    await expect(
      service.createDispatch({
        quotation_id: 'quote-1',
        customer_id: 'customer-1',
        installer_id: 'installer-1',
        items: [{ product_id: 'product-1', quantity_issued: 1 }],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'DISPATCH_ALREADY_EXISTS',
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('keeps returned non-serial stock pending until Inventory confirms it', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'DISPATCHED' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'item-1',
            dispatch_id: 'dispatch-1',
            product_id: 'product-1',
            inventory_item_id: null,
            quantity_issued: 2,
            unit_price: 100,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_PENDING' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);

    const service = await loadService();
    const dispatch = await service.reconcileDispatch('dispatch-1', {
      items: [{ id: 'item-1', quantity_used: 1, quantity_returned: 1 }],
    });

    const sql = client.query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(dispatch.status).toBe('RETURN_PENDING');
    expect(sql).toContain('SET status = $3');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('SET status = $3'), ['dispatch-1', null, 'RETURN_PENDING']);
    expect(sql).not.toContain('UPDATE public.products SET quantity = quantity +');
    expect(recordInventoryMovement).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('skips return review and sends an installed no-return job to Finance automatically', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'DISPATCHED' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'item-1', dispatch_id: 'dispatch-1', product_id: 'product-1', inventory_item_id: null, quantity_issued: 1, unit_price: 100 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);
    const dispatchRow = { id: 'dispatch-1', status: 'RETURN_CONFIRMED', dispatch_number: 'DSP-2026-0001', customer_id: 'customer-1', quotation_id: null };
    const billedDispatchRow = { ...dispatchRow, status: 'BILL_SENT' };
    const itemRows = [{ id: 'item-1', quantity_issued: 1, quantity_used: 1, quantity_returned: 0, unit_price: 100 }];
    query
      .mockResolvedValueOnce({ rows: [dispatchRow] })
      .mockResolvedValueOnce({ rows: itemRows })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [billedDispatchRow] })
      .mockResolvedValueOnce({ rows: itemRows })
      .mockResolvedValueOnce({ rows: [] });
    createClientInvoiceFromDispatch.mockResolvedValueOnce({ id: 'invoice-1', status: 'DRAFT' });

    const service = await loadService();
    const result = await service.reconcileDispatch('dispatch-1', {
      items: [{ id: 'item-1', quantity_used: 1, quantity_returned: 0 }],
    }, 'inventory-user-1');

    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('SET status = $3'), ['dispatch-1', null, 'RETURN_CONFIRMED']);
    expect(createClientInvoiceFromDispatch).toHaveBeenCalledWith(expect.objectContaining({ dispatch_id: 'dispatch-1', customer_id: 'customer-1' }));
    expect(result.status).toBe('STOCK_UPDATED');
    expect(result.invoice).toMatchObject({ id: 'invoice-1' });
  });

  it('locks only the dispatch item row and marks an Inventory-confirmed return once', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'dispatch-1', status: 'RETURN_PENDING', quotation_id: null, dispatch_number: 'DSP-2026-0001' }],
        })
        .mockResolvedValueOnce({ rows: [{ returned_quantity: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'item-1',
            dispatch_id: 'dispatch-1',
            product_id: 'product-1',
            inventory_item_id: null,
            quantity_issued: 1,
            unit_price: 100,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED', dispatch_number: 'DSP-2026-0001' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    const result = await service.confirmReturnRequest('dispatch-1', {
      items: [{ id: 'item-1', quantity_returned: 1, condition: 'GOOD', confirmed: true }],
    });

    const itemLockCall = client.query.mock.calls.find(([statement]) => String(statement).includes('LEFT JOIN public.products'));
    const sql = client.query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(String(itemLockCall?.[0])).toContain('FOR UPDATE OF di');
    expect(sql).toContain("SET status = 'RETURN_CONFIRMED'");
    expect(result.status).toBe('CONFIRMED');
  });

  it('confirms a completed job with no physical returns without requiring item checkboxes', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'dispatch-1', status: 'RETURN_PENDING', quotation_id: null, dispatch_number: 'DSP-2026-0001' }],
        })
        .mockResolvedValueOnce({ rows: [{ returned_quantity: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED', dispatch_number: 'DSP-2026-0001' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    const result = await service.confirmReturnRequest('dispatch-1', { items: [] });

    expect(result.status).toBe('CONFIRMED');
    expect(client.query.mock.calls.map(([sql]) => String(sql)).join('\n')).toContain("SET status = 'RETURN_CONFIRMED'");
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('restores aggregate product stock when a serialized return is confirmed good', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'dispatch-1', status: 'RETURN_PENDING', quotation_id: null, dispatch_number: 'DSP-2026-0001' }],
        })
        .mockResolvedValueOnce({ rows: [{ returned_quantity: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'item-1',
            dispatch_id: 'dispatch-1',
            product_id: 'product-1',
            inventory_item_id: 'serial-1',
            quantity_issued: 1,
            unit_price: 100,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'serial-1', product_id: 'product-1', current_status: 'AVAILABLE' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValueOnce(client);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'dispatch-1', status: 'RETURN_CONFIRMED', dispatch_number: 'DSP-2026-0001' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    await service.confirmReturnRequest('dispatch-1', {
      items: [{ id: 'item-1', quantity_returned: 1, condition: 'GOOD', confirmed: true }],
    });

    const sql = client.query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('UPDATE public.inventory_items SET current_status = $2');
    expect(sql).toContain('UPDATE public.products SET quantity = quantity + $2');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.products SET quantity = quantity + $2'),
      ['product-1', 1],
    );
  });

  it('closes a fully returned dispatch as no charge without generating a Finance invoice', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          id: 'dispatch-1',
          status: 'RETURN_CONFIRMED',
          dispatch_number: 'DSP-2026-0001',
          quotation_id: 'quote-1',
          customer_id: 'customer-1',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'item-1',
          dispatch_id: 'dispatch-1',
          quantity_issued: 1,
          quantity_used: 0,
          quantity_returned: 1,
          unit_price: 85000,
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'dispatch-1',
          status: 'NO_CHARGE',
          dispatch_number: 'DSP-2026-0001',
          quotation_id: 'quote-1',
          customer_id: 'customer-1',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'item-1',
          quantity_issued: 1,
          quantity_used: 0,
          quantity_returned: 1,
          unit_price: 85000,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const service = await loadService();
    const result = await service.sendAdjustedBillToFinance('dispatch-1', 'inventory-user');

    expect(result.status).toBe('NO_CHARGE');
    expect(result.no_charge).toBe(true);
    expect(result.bill_adjustment.final_adjusted_total).toBe(0);
    expect(createClientInvoiceFromDispatch).not.toHaveBeenCalled();
    expect(query.mock.calls.map(([sql]) => String(sql)).join('\n')).toContain("SET status = 'NO_CHARGE'");
  });
});
