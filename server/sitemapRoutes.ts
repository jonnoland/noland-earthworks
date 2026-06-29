import { Express } from "express";

const BASE_URL = "https://nolandearthworks.com";

// All public pages with their SEO priority and change frequency
const PAGES = [
  { path: "/",                                                          priority: "1.0", changefreq: "weekly"  },
  // Service pages
  { path: "/services/forestry-mulching",                                priority: "0.9", changefreq: "monthly" },
  { path: "/services/land-management",                                   priority: "0.9", changefreq: "monthly" },
  { path: "/services/vegetation-management",                            priority: "0.9", changefreq: "monthly" },
  { path: "/services/right-of-way-clearing",                            priority: "0.9", changefreq: "monthly" },
  { path: "/services/property-maintenance",                             priority: "0.8", changefreq: "monthly" },
  // Add-On service pages
  { path: "/services/add-ons/post-clear-seeding",                        priority: "0.7", changefreq: "monthly" },
  { path: "/services/add-ons/fence-line-clearing",                       priority: "0.7", changefreq: "monthly" },
  { path: "/services/add-ons/mulch-redistribution",                      priority: "0.7", changefreq: "monthly" },
  { path: "/services/add-ons/selective-clearing",                        priority: "0.7", changefreq: "monthly" },
  // Key pages
  { path: "/quote",                                                     priority: "0.9", changefreq: "monthly" },
  { path: "/pricing",                                                   priority: "0.8", changefreq: "monthly" },
  { path: "/about",                                                     priority: "0.6", changefreq: "monthly" },
  { path: "/gallery",                                                   priority: "0.7", changefreq: "monthly" },
  // Blog / Resources
  { path: "/blog",                                                      priority: "0.8", changefreq: "weekly"  },
  { path: "/blog/cost-of-land-management-tennessee",                      priority: "0.8", changefreq: "monthly" },
  { path: "/blog/forestry-mulching-vs-bulldozing",                      priority: "0.8", changefreq: "monthly" },
  { path: "/blog/signs-you-need-vegetation-management",                 priority: "0.7", changefreq: "monthly" },
  { path: "/blog/best-time-to-clear-land-tennessee",                    priority: "0.7", changefreq: "monthly" },
  { path: "/blog/site-preparation-before-building-tennessee",           priority: "0.8", changefreq: "monthly" },
  { path: "/blog/land-management-developers-farmers-middle-tennessee",    priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-williamson-county",                       priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-davidson-county",                         priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-rutherford-county",                       priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-maury-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-marshall-county",                         priority: "0.9", changefreq: "monthly" },
  { path: "/blog/forestry-mulching-vs-bush-hogging",                         priority: "0.8", changefreq: "monthly" },
  { path: "/blog/how-to-prepare-for-land-management",                          priority: "0.8", changefreq: "monthly" },
  { path: "/blog/pasture-reclamation-tennessee",                             priority: "0.8", changefreq: "monthly" },
  { path: "/blog/land-management-lincoln-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-wilson-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-montgomery-county",                         priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-giles-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-sumner-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-bedford-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-cheatham-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-lawrence-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-dickson-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-hickman-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-robertson-county",                           priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-trousdale-county",                           priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-benton-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-cannon-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-carroll-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-chester-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-decatur-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-gibson-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-hardin-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-henderson-county",                          priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-henry-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-houston-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-humphreys-county",                          priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-lewis-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-madison-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-moore-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-perry-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-stewart-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-wayne-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-weakley-county",                            priority: "0.9", changefreq: "monthly" },
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
  // XML Sitemap — dynamically generated so it always reflects the current page list
  app.get("/sitemap.xml", (_req, res) => {
    const lastmod = new Date().toISOString().split("T")[0];

    const urls = PAGES.map(
      ({ path, priority, changefreq }) => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    ).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h
    res.send(xml);
  });

  // llms.txt — AI search engine discovery file
  app.get("/llms.txt", (_req, res) => {
    const content = `# Noland Earthworks, LLC
> Veteran-owned forestry mulching and land management company serving 35 counties across Middle and West Tennessee. Specializing in tracked forestry mulching, land management, vegetation management, and right-of-way clearing. Owner-operated, licensed, and insured. Free on-site estimates.

## Services

- [Forestry Mulching](${BASE_URL}/services/forestry-mulching): Primary service. Tracked machine grinds trees, brush, and stumps into mulch in a single pass. No hauling, no burning, no bare soil.
- [Land Management](${BASE_URL}/services/land-management): Lot clearing, pasture reclamation, site prep, and fence line clearing for residential, agricultural, and commercial properties.
- [Vegetation Management](${BASE_URL}/services/vegetation-management): Control invasive species, overgrowth, and unwanted vegetation on roadsides, easements, and property boundaries.
- [Right-of-Way Clearing](${BASE_URL}/services/right-of-way-clearing): Driveway clearing, utility corridor clearing, and easement maintenance.
- [Property Maintenance](${BASE_URL}/services/property-maintenance): Ongoing brush and vegetation control to keep land clean and usable year-round.

## Service Area

Middle and West Tennessee. Core counties: Davidson, Williamson, Rutherford, Wilson, Maury, Dickson, Cheatham, Robertson, Sumner, Montgomery, Bedford, Marshall, Hickman, Lewis, Perry, Wayne, and 19 more across the region.

## Resources

- [Blog & Resources](${BASE_URL}/blog): Guides on forestry mulching, land management costs, seasonal timing, and county-specific land management.
- [Free Quote](${BASE_URL}/quote): Request a free on-site estimate.
- [Service Areas](${BASE_URL}/#service-areas): Full list of 35 counties served.

## Contact

- Phone: 615-406-4819
- Email: info@nolandearthworks.com
- Website: ${BASE_URL}
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
