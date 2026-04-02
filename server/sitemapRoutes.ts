import { Express } from "express";

const BASE_URL = "https://www.nolandearthworks.com";

// All public pages with their SEO priority and change frequency
const PAGES = [
  { path: "/",                         priority: "1.0", changefreq: "weekly"  },
  { path: "/services/forestry-mulching", priority: "0.9", changefreq: "monthly" },
  { path: "/services/land-clearing",    priority: "0.9", changefreq: "monthly" },
  { path: "/services/vegetation-management", priority: "0.9", changefreq: "monthly" },
  { path: "/services/site-preparation", priority: "0.9", changefreq: "monthly" },
  { path: "/quote",                     priority: "0.8", changefreq: "monthly" },
  { path: "/service-areas",             priority: "0.7", changefreq: "monthly" },
  { path: "/about",                     priority: "0.6", changefreq: "monthly" },
  { path: "/privacy-policy",            priority: "0.3", changefreq: "yearly"  },
  { path: "/terms-of-service",          priority: "0.3", changefreq: "yearly"  },
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
