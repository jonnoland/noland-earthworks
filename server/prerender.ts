/**
 * Bot-detection prerendering middleware.
 *
 * When a known search-engine crawler requests a page, this middleware
 * spins up a headless Chromium instance, loads the page, waits for the
 * React app to finish rendering, and returns the fully-rendered HTML.
 *
 * Regular visitors bypass this entirely and receive the normal SPA shell.
 */

import type { Request, Response, NextFunction } from "express";
import puppeteer from "puppeteer-core";

// ─── Bot user-agent detection ────────────────────────────────────────────────

const BOT_PATTERNS = [
  "googlebot",
  "google-inspectiontool",
  "bingbot",
  "slurp",          // Yahoo
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "sogou",
  "exabot",
  "facebot",
  "ia_archiver",
  "linkedinbot",
  "twitterbot",
  "whatsapp",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "prerender",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}

// ─── Simple in-memory cache (TTL: 1 hour) ────────────────────────────────────

interface CacheEntry {
  html: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (allows fresh renders after code changes)

function getCached(url: string): string | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.html;
}

function setCache(url: string, html: string): void {
  // Evict oldest entries if cache grows large
  if (cache.size > 200) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(url, { html, timestamp: Date.now() });
}

// ─── Puppeteer renderer ───────────────────────────────────────────────────────

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser() {
  if (browserInstance) {
    try {
      // Verify the browser is still alive
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }
  browserInstance = await puppeteer.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/usr/bin/chromium-browser",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-extensions",
    ],
  });
  return browserInstance;
}

async function renderPage(targetUrl: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Use a real browser UA so the app renders normally
    // Also set a custom header so our own middleware skips this internal request
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "X-Prerender-Internal": "1",
    });

    // Block images, fonts, media, and external analytics/map requests to speed up rendering
    await page.setRequestInterception(true);
    const BLOCKED_DOMAINS = [
      "google-analytics.com",
      "googletagmanager.com",
      "maps.googleapis.com",
      "manus-analytics.com",
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      // NOTE: cloudfront.net is intentionally NOT blocked — the app JS bundle
      // and static assets are served from CloudFront in production.
    ];
    page.on("request", (req) => {
      const type = req.resourceType();
      const url = req.url();
      if (["image", "media", "font"].includes(type)) {
        req.abort();
        return;
      }
      if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
        req.abort();
        return;
      }
      req.continue();
    });

    // Navigate and wait for the page to load
    await page.goto(targetUrl, {
      waitUntil: "load",
      timeout: 45000,
    });

    // Wait for React to mount — look for the root div to have children
    try {
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0;
        },
        { timeout: 10000 }
      );
    } catch {
      // If root never populates, proceed with whatever we have
    }

    // Wait for the canonical tag to be injected by usePageTitle hook
    try {
      await page.waitForSelector('link[rel="canonical"]', { timeout: 5000 });
    } catch {
      // Some pages may not set a canonical — proceed anyway
    }

    // Small buffer for any remaining deferred renders
    await new Promise((resolve) => setTimeout(resolve, 300));

    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

// ─── Express middleware ───────────────────────────────────────────────────────

export function prerenderMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userAgent = req.headers["user-agent"] || "";

  // Skip requests from our own prerender process (avoid infinite loop)
  if (req.headers["x-prerender-internal"] === "1") {
    next();
    return;
  }

  // Skip non-bot requests immediately
  if (!isBot(userAgent)) {
    next();
    return;
  }

  // Skip API routes, static assets, and special paths
  const path = req.path;
  if (
    path.startsWith("/api/") ||
    path.startsWith("/assets/") ||
    path.startsWith("/cdn-cgi/") ||
    path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|map|xml|txt)$/)
  ) {
    next();
    return;
  }

  // Build the full URL the headless browser will visit (use localhost)
  const port = (req.socket as { localPort?: number }).localPort || process.env.PORT || 3000;
  const targetUrl = `http://localhost:${port}${req.originalUrl}`;

  // Check cache first
  const cached = getCached(targetUrl);
  if (cached) {
    console.log(`[Prerender] Cache hit: ${req.originalUrl}`);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Prerendered", "cached");
    res.send(cached);
    return;
  }

  console.log(`[Prerender] Rendering for bot (${userAgent.slice(0, 60)}): ${req.originalUrl}`);

  renderPage(targetUrl)
    .then((html) => {
      // Inject canonical tag if not already present (React hook may not have fired)
      const BASE_URL = "https://nolandearthworks.com";
      if (!html.includes('rel="canonical"') && !html.includes("rel='canonical'")) {
        const canonicalTag = `<link rel="canonical" href="${BASE_URL}${req.path}">`;
        html = html.replace("</head>", `${canonicalTag}\n</head>`);
      }
      setCache(targetUrl, html);
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("X-Prerendered", "true");
      res.send(html);
    })
    .catch((err) => {
      console.error(`[Prerender] Error rendering ${req.originalUrl}:`, err);
      // Fall through to normal SPA serving on error
      next();
    });
}
