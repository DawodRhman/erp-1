import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLocalIp, clearLocalIpCache, prewarmLocalIpDetection } from './getLocalIp';

// Store the ICE candidate handler for each test
let iceCandidateHandler: ((event: RTCPeerConnectionIceEvent) => void) | null = null;

class MockRTCPeerConnection {
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  createDataChannel = vi.fn().mockReturnValue({});
  createOffer = vi.fn().mockResolvedValue({ sdp: 'offer' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
  
  constructor(config?: { iceServers?: any[] }) {
    // When setLocalDescription is called, simulate ICE candidate generation
    setTimeout(() => {
      if (this.onicecandidate && iceCandidateHandler) {
        this.onicecandidate({ candidate: { candidate: iceCandidateHandler } } as any);
      }
    }, 10);
  }
}

beforeEach(() => {
  vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
  iceCandidateHandler = null;
  clearLocalIpCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setIceCandidate(candidate: string | null) {
  iceCandidateHandler = candidate;
}

describe('getLocalIp', () => {
  it('detects private IP from ICE candidate', async () => {
    setIceCandidate('a=1 192.168.1.50 ...');
    const ip = await getLocalIp();
    expect(ip).toBe('192.168.1.50');
  });

  it('returns null for public IP', async () => {
    setIceCandidate('a=1 203.0.113.1 ...');
    const ip = await getLocalIp();
    expect(ip).toBeNull();
  });

  it('returns null on timeout (no ICE candidate)', async () => {
    setIceCandidate(null);
    const ip = await getLocalIp();
    expect(ip).toBeNull();
  });

  it('returns null when RTCPeerConnection throws', async () => {
    vi.stubGlobal('RTCPeerConnection', class {
      constructor() { throw new Error('WebRTC not supported'); }
    });
    
    const ip = await getLocalIp();
    expect(ip).toBeNull();
  });

  it('caches result for subsequent calls within TTL', async () => {
    setIceCandidate('a=1 10.0.0.100 ...');
    const ip1 = await getLocalIp();
    expect(ip1).toBe('10.0.0.100');
    
    // Second call should use cache
    const ip2 = await getLocalIp();
    expect(ip2).toBe('10.0.0.100');
  });

  it('returns 172.16-31.x.x as private IP', async () => {
    setIceCandidate('a=1 172.20.5.10 ...');
    const ip = await getLocalIp();
    expect(ip).toBe('172.20.5.10');
  });

  it('returns 172.32.x.x as null (not private)', async () => {
    setIceCandidate('a=1 172.32.1.1 ...');
    const ip = await getLocalIp();
    expect(ip).toBeNull();
  });

  it('prewarmLocalIpDetection starts detection', async () => {
    setIceCandidate('a=1 192.168.0.1 ...');
    prewarmLocalIpDetection();
    const ip = await getLocalIp();
    expect(ip).toBe('192.168.0.1');
  });
});