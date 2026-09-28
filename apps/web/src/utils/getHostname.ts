/**
 * Client hostname/session identifier detection with TTL caching.
 * 
 * Browsers do not expose the real hostname for privacy reasons.
 * This utility generates a persistent session-based identifier
 * that can be used to correlate audit logs from the same browser session.
 * 
 * PRIVACY NOTE: This is a pseudonymous session identifier, not the real hostname.
 * Controlled by VITE_AUDIT_SEND_HOSTNAME (default: true).
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: string | null;
  timestamp: number;
}

let hostnameCache: CacheEntry = { value: null, timestamp: 0 };
let detectionPromise: Promise<string | null> | null = null;

const STORAGE_KEY = 'ems_client_hostname';

function generateSessionId(): string {
  return `client-${Math.random().toString(36).substring(2, 10)}`;
}

function getStoredHostname(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredHostname(hostname: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, hostname);
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

async function detectHostname(): Promise<string | null> {
  // Try to get existing session identifier
  const stored = getStoredHostname();
  if (stored) {
    return stored;
  }

  // Generate new session identifier
  const hostname = generateSessionId();
  setStoredHostname(hostname);
  return hostname;
}

/**
 * Get the client's session-based hostname identifier.
 * Returns cached value if within TTL, otherwise retrieves/generates identifier.
 * Returns null if unavailable.
 */
export async function getHostname(): Promise<string | null> {
  const now = Date.now();
  if (hostnameCache.value !== null && (now - hostnameCache.timestamp) < CACHE_TTL_MS) {
    return hostnameCache.value;
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = (async () => {
    const hostname = await detectHostname();
    hostnameCache = { value: hostname, timestamp: Date.now() };
    detectionPromise = null;
    return hostname;
  })();

  return detectionPromise;
}

/**
 * Pre-warm the cache by starting detection early (e.g., on app init).
 * Call this during application bootstrap to avoid delay on first request.
 */
export function prewarmHostnameDetection(): void {
  getHostname();
}

/**
 * Clear the cached hostname (useful for testing or forced refresh).
 */
export function clearHostnameCache(): void {
  hostnameCache = { value: null, timestamp: 0 };
  detectionPromise = null;
}