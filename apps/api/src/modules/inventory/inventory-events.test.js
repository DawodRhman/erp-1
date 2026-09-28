import { describe, expect, it, vi } from 'vitest';

import {
  inventoryEventSubscriberCount,
  publishInventoryEvent,
  subscribeToInventoryEvents,
} from './inventory-events.js';

describe('inventory event bus', () => {
  it('publishes structured inventory events and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToInventoryEvents(listener);

    expect(inventoryEventSubscriberCount()).toBe(1);
    const event = publishInventoryEvent('stock.changed', {
      product_id: 'product-1',
      quantity: 4,
    });

    expect(event).toMatchObject({
      type: 'stock.changed',
      payload: { product_id: 'product-1', quantity: 4 },
    });
    expect(event.id).toEqual(expect.any(String));
    expect(event.occurred_at).toEqual(expect.any(String));
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
    expect(inventoryEventSubscriberCount()).toBe(0);
    publishInventoryEvent('stock.changed', { product_id: 'product-2' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
