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
  { path: "/blog/how-to-prepare-for-land-clearing",                          priority: "0.8", changefreq: "monthly" },
  { path: "/blog/pasture-reclamation-tennessee",                             priority: "0.8", changefreq: "monthly" },
  { path: "/blog/land-management-lincoln-county",                            priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-wilson-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-montgomery-county",                         priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-giles-county",                              priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-sumner-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-bedford-county",                             priority: "0.9", changefreq: "monthly" },
  { path: "/blog/land-management-cheatham-county",                            priority: "0.9", changefreq: "monthly" },
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
