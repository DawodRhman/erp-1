import { randomUUID } from 'node:crypto';

const subscribers = new Set();

export function subscribeToInventoryEvents(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function publishInventoryEvent(type, payload = {}) {
  const event = {
    id: randomUUID(),
    type,
    payload,
    occurred_at: new Date().toISOString(),
  };

  for (const listener of subscribers) {
    try {
      listener(event);
    } catch (error) {
      console.warn('Inventory event subscriber failed:', error.message);
    }
  }

  return event;
}

export function inventoryEventSubscriberCount() {
  return subscribers.size;
}
