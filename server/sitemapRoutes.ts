import { Express } from "express";

const BASE_URL = "https://www.nolandearthworks.com";

// All public pages with their SEO priority and change frequency
const PAGES = [
  { path: "/",                                        priority: "1.0", changefreq: "weekly"  },
  // Service pages
  { path: "/services/forestry-mulching",              priority: "0.9", changefreq: "monthly" },
  { path: "/services/land-clearing",                  priority: "0.9", changefreq: "monthly" },
  { path: "/services/vegetation-management",          priority: "0.9", changefreq: "monthly" },
  { path: "/services/property-maintenance",           priority: "0.9", changefreq: "monthly" },
  // Key pages
  { path: "/quote",                                   priority: "0.8", changefreq: "monthly" },
  { path: "/about",                                   priority: "0.6", changefreq: "monthly" },
  // County landing pages
  { path: "/service-areas/davidson-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/williamson-county",         priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/rutherford-county",         priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/wilson-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/sumner-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/robertson-county",          priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/cheatham-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/dickson-county",            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/maury-county",              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/wayne-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/cannon-county",            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/bedford-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/montgomery-county",        priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lewis-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/perry-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/benton-county",            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/hickman-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/houston-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/humphreys-county",         priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/stewart-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/marshall-county",          priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/giles-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lincoln-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/moore-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/lawrence-county",          priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/dekalb-county",            priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/smith-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/trousdale-county",         priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/macon-county",             priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/jackson-county",           priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/clay-county",              priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas/putnam-county",            priority: "0.8", changefreq: "monthly" },
  // Legal
  { path: "/privacy-policy",                         priority: "0.3", changefreq: "yearly"  },
  { path: "/terms-of-service",                       priority: "0.3", changefreq: "yearly"  },
];

export function registerSitemapRoutes(app: Express) {
  // XML Sitemap
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
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.setHeader("Content-Type", "text/plain");
    res.send(content);
  });
}
