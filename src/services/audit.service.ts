/**
 * Audit Logging Service
 *
 * Audit logging is disabled per application configuration.
 */

export async function writeAuditLog(_payload?: unknown): Promise<string> {
  // Audit logging is disabled - no-op
  return '';
}

export async function getRecentAuditLogs(_count = 50): Promise<Array<Record<string, unknown>>> {
  return [];
}
