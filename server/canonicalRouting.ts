const NON_PAGE_PREFIXES = ["/api/", "/assets/", "/cdn-cgi/"];

/**
 * Returns the canonical no-trailing-slash path for a public page request.
 * API and asset routes retain their original paths because they are not page canonicals.
 */
export function getTrailingSlashCanonicalRedirect(
  path: string,
  method: string
): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  if (path.length <= 1 || !path.endsWith("/")) return null;
  if (NON_PAGE_PREFIXES.some(prefix => path.startsWith(prefix))) return null;

  return path.replace(/\/+$/, "");
}
