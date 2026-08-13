import type { Express } from "express";

export const LEGACY_SEO_REDIRECTS: Record<string, string> = {
  "/blog/cost-of-land-clearing-tennessee": "/blog/cost-of-land-management-tennessee",
  "/services/mulch-redistribution": "/services/add-ons/mulch-redistribution",
  "/services/selective-clearing": "/services/add-ons/selective-clearing",
  "/services/add-ons/post-clear-seeding": "/services/forestry-mulching",
};

export function getLegacySeoRedirect(pathname: string): string | undefined {
  return LEGACY_SEO_REDIRECTS[pathname];
}

export function registerLegacySeoRedirects(app: Express) {
  for (const [source, destination] of Object.entries(LEGACY_SEO_REDIRECTS)) {
    app.get(source, (_req, res) => res.redirect(301, destination));
  }
}
