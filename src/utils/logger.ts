/**
 * logger.ts
 * =========
 * Structured logging utility for Musick.
 * Prevents repetitive log spam and formats errors cleanly as JSON objects:
 * {
 *   operation,
 *   status,
 *   code,
 *   message,
 *   details,
 *   hint
 * }
 */

export interface StructuredErrorLog {
  operation: string;
  status: number | string;
  code?: string;
  message: string;
  details?: unknown;
  hint?: string;
}

const seenLogHashes = new Set<string>();

export function logStructuredError(log: StructuredErrorLog): void {
  const hashKey = `${log.operation}:${log.status}:${log.code || ""}:${log.message}`;
  if (seenLogHashes.has(hashKey)) return; // Deduplicate logging to avoid console spam
  seenLogHashes.add(hashKey);

  console.warn(`[MusickLog] ${log.operation}`, {
    operation: log.operation,
    status: log.status,
    code: log.code || "ERR",
    message: log.message,
    details: log.details || null,
    hint: log.hint || undefined,
  });
}
