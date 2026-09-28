/**
 * Frontend Audit Configuration
 * 
 * Controls what identity information is sent with API requests for audit logging.
 * 
 * PRIVACY NOTE: Sending private IPs and hostnames may have GDPR/privacy implications.
 * These feature flags allow disabling at build time via environment variables.
 * 
 * Environment variables (set at build time via Vite):
 * - VITE_AUDIT_SEND_PRIVATE_IP: Set to 'false' to disable private IP header (default: true)
 * - VITE_AUDIT_SEND_HOSTNAME: Set to 'false' to disable hostname header (default: true)
 */

export const AUDIT_FEATURES = {
  sendPrivateIp: import.meta.env.VITE_AUDIT_SEND_PRIVATE_IP !== 'false',
  sendHostname: import.meta.env.VITE_AUDIT_SEND_HOSTNAME !== 'false',
};