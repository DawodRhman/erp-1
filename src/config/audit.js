/**
 * Audit Configuration
 * 
 * Controls what identity information is captured in audit logs.
 * 
 * PRIVACY NOTE: Capturing private IP addresses and hostnames may have
 * GDPR/privacy implications in certain jurisdictions. Ensure legal
 * review before enabling in production.
 * 
 * Environment variables:
 * - AUDIT_CAPTURE_PRIVATE_IP: Set to 'false' to disable private IP capture (default: true)
 * - AUDIT_CAPTURE_HOSTNAME: Set to 'false' to disable hostname capture (default: true)
 */

export const AUDIT_CONFIG = {
  capturePrivateIp: process.env.AUDIT_CAPTURE_PRIVATE_IP !== 'false',
  captureHostname: process.env.AUDIT_CAPTURE_HOSTNAME !== 'false',
};