/**
 * Private IP address detection with TTL caching.
 * 
 * APPROACH:
 * 1. Primary: WebRTC with STUN server (Google's public STUN)
 *    - Modern browsers (Chrome 76+, FF 70+, Safari 13+) return mDNS names (.local) instead of raw IPs
 *    - Only works if browser flags are disabled OR user granted getUserMedia permission
 * 
 * 2. Fallback: None - browsers intentionally block this for privacy
 * 
 * ENTERPRISE SOLUTION:
 * For reliable private IP capture in corporate environments, configure your
 * reverse proxy / VPN / load balancer to add the private IP as a header:
 *   - Nginx: `proxy_set_header X-Client-Private-IP $remote_addr;` (when client is on LAN)
 *   - Or have an agent/service on the machine that reports its IP
 * 
 * PRIVACY NOTE: This captures the user's private IP for audit traceability.
 * Ensure compliance with GDPR/local privacy laws before enabling in production.
 * Controlled by VITE_AUDIT_SEND_PRIVATE_IP (default: true).
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: string | null;
  timestamp: number;
}

let localIpCache: CacheEntry = { value: null, timestamp: 0 };
let detectionPromise: Promise<string | null> | null = null;

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

function isPrivateIp(ip: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
}

function isMdnsName(candidate: string): boolean {
  return /[a-f0-9-]{36}\.local/.test(candidate);
}

async function detectLocalIpViaWebRTC(): Promise<string | null> {
  try {
    // Use STUN servers to get more complete ICE candidates
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise<string | null>((resolve) => {
      // Shorter timeout for faster test execution
      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);

      let resolved = false;
      pc.onicecandidate = (ice) => {
        if (resolved) return;
        // Gathering complete (no more candidates) — resolve with null
        if (!ice.candidate) {
          resolved = true;
          clearTimeout(timeout);
          pc.close();
          resolve(null);
          return;
        }
        const candidate = ice.candidate.candidate;
        
        // Look for raw IP addresses first
        const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          const ip = ipMatch[1];
          if (isPrivateIp(ip)) {
            resolved = true;
            clearTimeout(timeout);
            pc.close();
            resolve(ip);
            return;
          }
        }

        // Note: mDNS names (xxxx.local) cannot be resolved in browser JS
        // They require browser-internal mDNS resolution which we can't access
      };
    });
  } catch {
    return null;
  }
}

/**
 * Get the client's private/local IP address.
 * Returns cached value if within TTL, otherwise performs new detection.
 * Returns null if detection fails, times out, or browser privacy features block it.
 * 
 * LIMITATION: Modern browsers obfuscate private IPs as mDNS names (.local).
 * This only works if user has disabled browser privacy flags or granted getUserMedia.
 * For enterprise: configure your proxy/VPN to pass the private IP via header.
 */
export async function getLocalIp(): Promise<string | null> {
  const now = Date.now();
  if (localIpCache.value !== null && (now - localIpCache.timestamp) < CACHE_TTL_MS) {
    return localIpCache.value;
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = (async () => {
    const ip = await detectLocalIpViaWebRTC();
    localIpCache = { value: ip, timestamp: Date.now() };
    detectionPromise = null;
    return ip;
  })();

  return detectionPromise;
}

/**
 * Pre-warm the cache by starting detection early (e.g., on app init).
 * Call this during application bootstrap to avoid delay on first request.
 */
export function prewarmLocalIpDetection(): void {
  getLocalIp();
}

/**
 * Clear the cached IP (useful for testing or forced refresh).
 */
export function clearLocalIpCache(): void {
  localIpCache = { value: null, timestamp: 0 };
  detectionPromise = null;
}