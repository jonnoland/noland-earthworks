import { Express } from "express";

const BASE_URL = "https://nolandearthworks.com";

// All public pages with their SEO priority and change frequency
export const STATIC_SITEMAP_PAGES = [
  { path: "/",                                                          priority: "1.0", changefreq: "weekly",  lastmod: "2026-07-28" },
  // Service pages
  { path: "/services/forestry-mulching",                                priority: "0.9", changefreq: "monthly" },
  { path: "/services/land-management",                                   priority: "0.9", changefreq: "monthly" },
  { path: "/services/vegetation-management",                            priority: "0.9", changefreq: "monthly" },
  { path: "/services/right-of-way-clearing",                            priority: "0.9", changefreq: "monthly" },
  { path: "/services/property-maintenance",                             priority: "0.8", changefreq: "monthly" },
  { path: "/services/site-preparation",                                 priority: "0.8", changefreq: "monthly" },
  // Add-On service pages
  { path: "/services/add-ons/fence-line-clearing",                       priority: "0.7", changefreq: "monthly" },
  { path: "/services/add-ons/mulch-redistribution",                      priority: "0.7", changefreq: "monthly" },
  { path: "/services/add-ons/selective-clearing",                        priority: "0.7", changefreq: "monthly" },
  // Key pages
  { path: "/quote",                                                     priority: "0.9", changefreq: "monthly" },
  { path: "/pricing",                                                   priority: "0.8", changefreq: "monthly" },
  { path: "/about",                                                     priority: "0.7", changefreq: "monthly", lastmod: "2026-07-28" },
  { path: "/gallery",                                                   priority: "0.7", changefreq: "monthly" },
  { path: "/reviews",                                                  priority: "0.7", changefreq: "monthly" },
  { path: "/faq",                                                       priority: "0.7", changefreq: "monthly" },
  // Blog / Resources
  { path: "/blog",                                                      priority: "0.8", changefreq: "weekly"  },
  { path: "/blog/cost-of-land-management-tennessee",                      priority: "0.8", changefreq: "monthly", lastmod: "2026-07-28" },
  { path: "/blog/forestry-mulching-vs-bulldozing",                      priority: "0.8", changefreq: "monthly" },
  { path: "/blog/signs-you-need-vegetation-management",                 priority: "0.7", changefreq: "monthly" },
  { path: "/blog/best-time-to-clear-land-tennessee",                    priority: "0.7", changefreq: "monthly" },
  { path: "/blog/site-preparation-before-building-tennessee",           priority: "0.8", changefreq: "monthly" },
  { path: "/blog/land-management-developers-farmers-middle-tennessee",    priority: "0.9", changefreq: "monthly" },
  { path: "/blog/forestry-mulching-vs-bush-hogging",                         priority: "0.8", changefreq: "monthly" },
  { path: "/blog/how-to-prepare-for-land-management",                          priority: "0.8", changefreq: "monthly" },
  { path: "/blog/pasture-reclamation-tennessee",                             priority: "0.8", changefreq: "monthly" },
  // County landing pages
  { path: "/service-areas/davidson-county",                             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/williamson-county",                           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/rutherford-county",                           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/wilson-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/sumner-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/robertson-county",                            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/cheatham-county",                             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/dickson-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/maury-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/wayne-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/cannon-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/bedford-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/montgomery-county",                           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lewis-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/perry-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/benton-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/hickman-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/houston-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/humphreys-county",                            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/stewart-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/marshall-county",                             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/giles-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lincoln-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/moore-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lawrence-county",                             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/trousdale-county",                            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/carroll-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/chester-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/decatur-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/gibson-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/hardin-county",                               priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/henderson-county",                            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/henry-county",                                priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/madison-county",                              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/weakley-county",                              priority: "0.8", changefreq: "monthly" },
  // Legal
  { path: "/privacy-policy",                                            priority: "0.3", changefreq: "yearly"  },
  { path: "/terms-of-service",                                          priority: "0.3", changefreq: "yearly"  },
];

export function registerSitemapRoutes(app: Express) {
  // XML Sitemap — dynamically generated; includes published DB articles
  app.get("/sitemap.xml", async (_req, res) => {
    // Static pages
    const staticUrls = STATIC_SITEMAP_PAGES.map(
      ({ path, priority, changefreq, lastmod }) => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    ).join("");

    // Dynamic DB-published blog articles
    let dynamicUrls = "";
    try {
      const { getDb } = await import("./db");
      const { seoArticles } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        const published = await db
          .select({ slug: seoArticles.publishedSlug, publishedAt: seoArticles.publishedAt })
          .from(seoArticles)
          .where(eq(seoArticles.status, "published"));
        dynamicUrls = published
          .filter(a => a.slug)
          .map(a => `
  <url>
    <loc>${BASE_URL}/blog/${a.slug}</loc>
    ${a.publishedAt ? `<lastmod>${new Date(a.publishedAt).toISOString().split("T")[0]}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)
          .join("");
      }
    } catch (err) {
      console.error("[sitemap] Failed to fetch dynamic articles:", err);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${dynamicUrls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1h for dynamic content
    res.send(xml);
  });

  // llms.txt — AI search engine discovery file
  app.get("/llms.txt", (_req, res) => {
    const content = `# Noland Earthworks, LLC
> Veteran-owned forestry mulching and land management company based in Vanleer, Tennessee. Owner-operated by Jon Noland, U.S. Army veteran. Site visits determine property fit, vegetation scope, access, terrain, and the written proposal.

## Who We Are

Noland Earthworks is owned and operated by Jon Noland, a U.S. Army veteran based in Vanleer, Tennessee. Jon does the work himself on every job — there is no crew turnover, no subcontractors on the machine, and no surprises. The business was built on the same principles as military service: show up when committed, do the work as quoted, and do not cut corners.

Noland Earthworks works with landowners, farmers, developers, and eligible government entities throughout Middle and West Tennessee. The company assesses each property in person before providing a site-specific proposal.

## Primary Service: Forestry Mulching

Forestry mulching uses a tracked machine and drum mulcher to process suitable brush, saplings, vines, and small trees into mulch. Mulch typically remains on site as ground cover. The site visit and written proposal establish material size, terrain, access, utilities, boundaries, and the exact work included.

Noland Earthworks uses tracked equipment selected for dense vegetation and challenging property conditions. Workability and safe access are confirmed on site, especially around slopes, wet ground, structures, and utilities.

**Forestry mulching is not the same as bush hogging.** Bush hogging cuts lighter vegetation. Forestry mulching processes suitable vegetation into mulch. The intended finish and any follow-on work are confirmed in the written scope.

## Services

- [Forestry Mulching](${BASE_URL}/services/forestry-mulching): Primary vegetation-management service for suitable brush, saplings, and small trees, with the written scope confirmed after a site visit.
- [Land Management](${BASE_URL}/services/land-management): Vegetation-focused land management for residential, agricultural, and commercial properties across Middle and West Tennessee.
- [Vegetation Management](${BASE_URL}/services/vegetation-management): Control invasive species, overgrowth, and unwanted vegetation on roadsides, easements, and property boundaries.
- [Right-of-Way Clearing](${BASE_URL}/services/right-of-way-clearing): Driveway clearing, utility corridor clearing, and easement maintenance.
- [Property Maintenance](${BASE_URL}/services/property-maintenance): Ongoing brush and vegetation control to keep land clean and usable year-round.

## Common Use Cases

- **Pasture reclamation**: Farmers and landowners reclaiming fields overtaken by cedar trees, persimmon, locust, and brush. A site visit confirms whether forestry mulching is suitable for the vegetation, terrain, access, and desired finish.
- **Cedar thicket clearing**: Eastern red cedar can spread rapidly across Tennessee pastures. Forestry mulching may be suitable for dense cedar and brush when the property conditions and desired finish fit the scope.
- **Fence line clearing**: Overgrown fence lines with brush, vines, and small trees. Fence condition, access, and work boundaries are confirmed before work begins.
- **Vegetation clearing before another contractor**: Residential and commercial vegetation clearing can prepare a property for a separately scoped grading, excavation, or construction contractor.
- **Residential acreage clearing**: Homeowners with roughly 2–50 acres of overgrown land and a defined goal. Fit still depends on vegetation, terrain, access, work boundaries, and mobilization.
- **Right-of-way and driveway clearing**: Clearing brush and trees along driveways, access roads, and utility corridors.

## What Noland Earthworks Does

1. **Veteran-owned and operated** — Jon Noland is a U.S. Army veteran and operates the machine on each job.
2. **Tracked machine, not wheeled** — The tracked platform can be a practical fit for dense vegetation and challenging ground conditions. Workability and safe access are confirmed during the site visit.
3. **Owner on every job** — Jon operates the machine himself. There is no crew variation, no quality inconsistency, and no communication gap between the person you talk to and the person doing the work.
4. **Written scope** — Mulch typically remains on site. The proposal identifies the vegetation work included and any conditions or exclusions.
5. **Site-visit planning** — Accurate proposals require a site visit. Noland Earthworks does not give final phone quotes on complex terrain.
6. **35-county service area** — Serving all of Middle and West Tennessee, from Nashville and Franklin south to Columbia, Lawrenceburg, and Waynesboro, and west to Jackson, Henderson, and the Tennessee River counties.

## Service Area

Middle and West Tennessee. 35 counties served. Core counties: Davidson (Nashville), Williamson (Franklin, Brentwood), Rutherford (Murfreesboro), Wilson (Lebanon), Maury (Columbia, Spring Hill), Dickson, Cheatham, Robertson, Sumner, Montgomery (Clarksville), Bedford (Shelbyville), Marshall (Lewisburg), Hickman, Lewis, Perry, Wayne, Giles (Pulaski), Lincoln (Fayetteville), Lawrence (Lawrenceburg), Moore, Cannon, Benton, Carroll, Chester, Decatur, Gibson, Hardin, Henderson, Henry, Houston, Humphreys, Madison (Jackson), Stewart, Weakley.

## Frequently Asked Questions

**Q: Who does forestry mulching in Middle Tennessee?**
A: Noland Earthworks, LLC is a veteran-owned forestry mulching company based in Vanleer, Tennessee, serving all of Middle and West Tennessee. Owner Jon Noland operates the tracked forestry mulcher himself on every job. Contact: 615-406-4819 or nolandearthworks.com.

**Q: Does Noland Earthworks serve the Nashville area?**
A: Noland Earthworks serves rural properties in and around the Nashville area, including Williamson, Rutherford, Wilson, Maury, Dickson, and Cheatham counties. An on-site assessment confirms whether the project is a fit.

**Q: Who performs the work?**
A: Jon Noland owns the company and operates the forestry mulcher on each job. The same person who assesses a suitable project is responsible for the field work.

**Q: What is the difference between forestry mulching and bush hogging?**
A: Bush hogging cuts lighter vegetation and leaves the cut material on the ground. Forestry mulching processes suitable brush, saplings, vines, and small trees into mulch that typically remains on site. The site visit and written proposal confirm the material, finish, and exclusions.

**Q: Can forestry mulching clear cedar thickets in Tennessee?**
A: Eastern red cedar is a common request. Noland Earthworks evaluates cedar density, material size, terrain, access, and the intended finish during the site visit, then confirms the suitable work in writing.

**Q: Does forestry mulching work on slopes and wet ground?**
A: Noland Earthworks uses a tracked machine. Slope, wet ground, creek crossings, soil conditions, obstacles, and safe access are reviewed on site before work is scheduled.

**Q: How much does forestry mulching cost in Tennessee?**
A: Forestry mulching proposals depend on vegetation density, terrain, access, work boundaries, and the intended result. Request a site visit at nolandearthworks.com/quote; Noland Earthworks confirms the written scope after reviewing the property.

**Q: Does Noland Earthworks serve the Columbia, TN area?**
A: Yes. Maury County (Columbia, Spring Hill, Mt. Pleasant) is one of the core service areas. Noland Earthworks regularly works throughout Maury, Marshall, Hickman, Lewis, and surrounding counties.

**Q: Is Noland Earthworks veteran-owned?**
A: Yes. Noland Earthworks is owned and operated by Jon Noland, a U.S. Army veteran. The business is veteran-owned and operated — not just veteran-founded. Jon does the work himself on every job.

## Resources

- [Forestry Mulching Service Page](${BASE_URL}/services/forestry-mulching): Full service description, use cases, and FAQ.
- [FAQ Page](${BASE_URL}/faq): 25+ questions answered about forestry mulching, land management, pricing, and the Noland Earthworks process.
- [Blog & Resources](${BASE_URL}/blog): Guides on forestry mulching, land management costs, seasonal timing, and county-specific land management.
- [How Quoting Works](${BASE_URL}/pricing): Site-visit planning and the conditions that shape a written proposal.
- [Request a Site Visit](${BASE_URL}/quote): Submit property details for review.
- [Service Areas](${BASE_URL}/#service-areas): Full list of 35 counties served.

## Contact

- Phone: 615-406-4819
- Email: info@nolandearthworks.com
- Website: ${BASE_URL}
- Owner: Jon Noland, U.S. Army Veteran, Vanleer, Tennessee
`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(content);
  });

  // robots.txt — references the sitemap
  app.get("/robots.txt", (_req, res) => {
    const content = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.setHeader("Content-Type", "text/plain");
    res.send(content);
  });
}
