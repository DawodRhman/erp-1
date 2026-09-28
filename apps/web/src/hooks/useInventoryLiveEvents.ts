import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../config/apiConfig';

const EVENT_TYPES = ['stock.changed', 'product.changed', 'workflow.changed'];

export function useInventoryLiveEvents(onChange: () => void) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      const fallback = window.setInterval(() => callbackRef.current(), 15000);
      return () => window.clearInterval(fallback);
    }

    const source = new EventSource(`${getApiBaseUrl()}/inventory/events`, { withCredentials: true });
    const handleChange = () => callbackRef.current();
    EVENT_TYPES.forEach((type) => source.addEventListener(type, handleChange));

    return () => {
      EVENT_TYPES.forEach((type) => source.removeEventListener(type, handleChange));
      source.close();
    };
  }, []);
}
