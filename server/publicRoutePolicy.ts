import { STATIC_SITEMAP_PAGES } from "./sitemapRoutes";

const STATIC_PUBLIC_PATHS = new Set(STATIC_SITEMAP_PAGES.map((page) => page.path));
const ROUTE_PREFIXES = ["/blog/", "/quote/", "/portal/", "/ops/"];
const ROUTE_EXACT_MATCHES = new Set(["/ops", "/portal"]);
const ADDITIONAL_PUBLIC_PATHS = new Set([
  "/ops/register",
  "/services/trail-cutting",
  "/services/mulch-redistribution",
  "/services/add-ons/selective-mulching",
  "/services/add-ons/post-clear-seeding",
  "/field-release-notes",
]);

export function isKnownSpaRoute(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    STATIC_PUBLIC_PATHS.has(normalizedPath) ||
    ADDITIONAL_PUBLIC_PATHS.has(normalizedPath) ||
    ROUTE_EXACT_MATCHES.has(normalizedPath) ||
    ROUTE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  );
}

export const spaNotFoundHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page Not Found | Noland Earthworks</title></head><body><main><h1>Page not found</h1><p>The page you requested is not available.</p><p><a href="/">Return to Noland Earthworks</a></p></main></body></html>`;
