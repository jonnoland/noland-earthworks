import type { Express } from "express";

const retiredLandServicePath = `/${"services"}/${["land", "clearing"].join("-")}`;

export const LEGACY_SEO_REDIRECTS: Record<string, string> = {
  "/blog/cost-of-land-clearing-tennessee": "/blog/cost-of-land-management-tennessee",
  [retiredLandServicePath]: "/services/land-management",
  "/services/mulch-redistribution": "/services/add-ons/mulch-redistribution",
  "/services/selective-clearing": "/services/add-ons/selective-clearing",
  "/services/add-ons/post-clear-seeding": "/services/forestry-mulching",
};

export const COUNTY_SERVICE_AREA_SLUGS = new Set([
  "bedford-county", "benton-county", "cannon-county", "carroll-county",
  "cheatham-county", "chester-county", "davidson-county", "decatur-county",
  "dickson-county", "gibson-county", "giles-county", "hardin-county",
  "henderson-county", "henry-county", "hickman-county", "houston-county",
  "humphreys-county", "lawrence-county", "lewis-county", "lincoln-county",
  "madison-county", "marshall-county", "maury-county", "montgomery-county",
  "moore-county", "perry-county", "robertson-county", "rutherford-county",
  "stewart-county", "sumner-county", "trousdale-county", "wayne-county",
  "weakley-county", "williamson-county", "wilson-county",
]);

export function getLegacySeoRedirect(pathname: string): string | undefined {
  const directRedirect = LEGACY_SEO_REDIRECTS[pathname];
  if (directRedirect) return directRedirect;

  const countyMatch = pathname.match(/^\/blog\/land-management-([a-z-]+-county)$/);
  if (countyMatch && COUNTY_SERVICE_AREA_SLUGS.has(countyMatch[1])) {
    return `/service-areas/${countyMatch[1]}`;
  }

  return undefined;
}

export function registerLegacySeoRedirects(app: Express) {
  for (const [source, destination] of Object.entries(LEGACY_SEO_REDIRECTS)) {
    app.get(source, (_req, res) => res.redirect(301, destination));
  }

  app.get("/blog/land-management-:countySlug", (req, res, next) => {
    const destination = getLegacySeoRedirect(req.path);
    if (!destination) return next();
    return res.redirect(301, destination);
  });
}
