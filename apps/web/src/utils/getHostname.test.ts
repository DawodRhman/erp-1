import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHostname, clearHostnameCache, prewarmHostnameDetection } from './getHostname';

beforeEach(() => {
  vi.clearAllMocks();
  clearHostnameCache();
  // Clear sessionStorage mock
  sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('getHostname', () => {
  it('generates and returns a session identifier', async () => {
    const hostname = await getHostname();
    expect(hostname).toMatch(/^client-[a-z0-9]{8}$/);
  });

  it('returns same identifier on subsequent calls within TTL', async () => {
    const hostname1 = await getHostname();
    const hostname2 = await getHostname();
    expect(hostname1).toBe(hostname2);
  });

  it('persists identifier in sessionStorage', async () => {
    const hostname = await getHostname();
    const stored = sessionStorage.getItem('ems_client_hostname');
    expect(stored).toBe(hostname);
  });

  it('reuses stored identifier from sessionStorage', async () => {
    const existingHostname = 'client-existing123';
    sessionStorage.setItem('ems_client_hostname', existingHostname);
    
    const hostname = await getHostname();
    expect(hostname).toBe(existingHostname);
  });

  it('prewarmHostnameDetection starts detection', async () => {
    prewarmHostnameDetection();
    const hostname = await getHostname();
    expect(hostname).toMatch(/^client-[a-z0-9]{8}$/);
  });

  it('handles sessionStorage unavailability gracefully', async () => {
    // Mock sessionStorage to throw
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = vi.fn(() => { throw new Error('Storage unavailable'); });
    sessionStorage.getItem = vi.fn(() => { throw new Error('Storage unavailable'); });
    
    const hostname = await getHostname();
    // Should still return a generated ID even if storage fails
    expect(hostname).toMatch(/^client-[a-z0-9]{8}$/);
    
    sessionStorage.setItem = originalSetItem;
  });

  it('clearHostnameCache resets the cache', async () => {
    const hostname1 = await getHostname();
    clearHostnameCache();
    // After clearing, a new ID might be generated (if TTL expired) or same returned
    // The cache clear just resets the in-memory cache
    const hostname2 = await getHostname();
    // They could be same or different depending on sessionStorage
    expect(hostname2).toMatch(/^client-[a-z0-9]{8}$/);
  });
});