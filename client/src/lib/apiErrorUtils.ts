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
    "unexpected token 's'",
    "service unavailable",
    "gateway time-out",
    "gateway timeout",
  ].some((needle) => message.includes(needle));
}

export function auditServiceErrorMessage(error: unknown): string {
  if (isTransientApiTransportError(error)) {
    return "Audit service is temporarily unavailable. No audit was saved. Please try again in a minute.";
  }
  return error instanceof Error && error.message ? error.message : "Audit failed. Please try again.";
}
