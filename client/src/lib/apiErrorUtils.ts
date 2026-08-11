/**
 * Identifies transient transport failures where a proxy/gateway returns HTML
 * instead of the JSON payload expected by tRPC. These are retryable platform
 * failures, not application or authentication errors.
 */
export function isTransientApiTransportError(error: unknown): boolean {
  if (error instanceof TypeError) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return [
    "failed to fetch",
    "load failed",
    "network request failed",
    "unexpected token '<'",
    "gateway time-out",
    "gateway timeout",
  ].some((needle) => message.includes(needle));
}
