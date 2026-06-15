/**
 * SEO Audit Engine for Noland Earthworks
 * Performs a comprehensive on-page SEO audit by fetching and parsing the target URL,
 * then scoring it across five categories: On-Page SEO, Links, Usability, Performance, Social.
 */
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  id: string;
  category: "onpage" | "links" | "usability" | "performance" | "social";
  label: string;
  status: CheckStatus;
  value?: string;
  detail: string;
  recommendation?: string;
  /** Ready-to-paste code snippet or step-by-step instructions showing exactly how to fix this check. */
  fixExample?: string;
  priority: "high" | "medium" | "low";
}

export interface SeoAuditResult {
  url: string;
  auditedAt: Date;
  overallScore: number;
  overallGrade: string;
  onPageScore: number;
  linksScore: number;
  usabilityScore: number;
  performanceScore: number;
  socialScore: number;
  checks: SeoCheck[];
  recommendations: Array<{ priority: "high" | "medium" | "low"; text: string; category: string }>;
  pageTitle: string | null;
  metaDescription: string | null;
  loadTimeMs: number | null;
  mobileScore: number | null;
}

function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function categoryScore(checks: SeoCheck[], category: SeoCheck["category"]): number {
  const cats = checks.filter((c) => c.category === category);
  if (cats.length === 0) return 100;
  const weights = { pass: 1, warn: 0.5, fail: 0 };
  const total = cats.reduce((acc, c) => {
    const w = c.priority === "high" ? 3 : c.priority === "medium" ? 2 : 1;
    return acc + w;
  }, 0);
  const earned = cats.reduce((acc, c) => {
    const w = c.priority === "high" ? 3 : c.priority === "medium" ? 2 : 1;
    return acc + w * weights[c.status];
  }, 0);
  return Math.round((earned / total) * 100);
}

async function fetchWithPuppeteer(url: string): Promise<{ html: string; loadTimeMs: number; finalUrl: string }> {
  const start = Date.now();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; NolandEarthworksSEOBot/1.0; +https://nolandearthworks.com)");
    await page.setViewport({ width: 1280, height: 900 });
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const finalUrl = response?.url() ?? url;
    await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});
    const html = await page.content();
    const loadTimeMs = Date.now() - start;
    return { html, loadTimeMs, finalUrl };
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchWithFallback(url: string): Promise<{ html: string; loadTimeMs: number; finalUrl: string }> {
  // Try Puppeteer first for full React SPA rendering.
  // Falls back to plain fetch if Chrome binary is unavailable (e.g., production server).
  try {
    return await fetchWithPuppeteer(url);
  } catch (puppeteerErr) {
    console.warn("[SEO Audit] Puppeteer unavailable, falling back to plain fetch:", (puppeteerErr as Error).message?.slice(0, 120));
    const start = Date.now();
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NolandEarthworksSEOBot/1.0; +https://nolandearthworks.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const loadTimeMs = Date.now() - start;
    return { html, loadTimeMs, finalUrl: res.url };
  }
}

async function fetchWithTiming(url: string): Promise<{ html: string; loadTimeMs: number; finalUrl: string }> {
  return fetchWithFallback(url);
}

async function fetchPageSpeedScore(url: string, apiKey?: string): Promise<{ mobile: number | null }> {
  try {
    const endpoint = apiKey
      ? `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`
      : `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { mobile: null };
    const data = await res.json() as any;
    const score = data?.lighthouseResult?.categories?.performance?.score;
    return { mobile: score != null ? Math.round(score * 100) : null };
  } catch {
    return { mobile: null };
  }
}

export async function runSeoAudit(targetUrl: string, googleApiKey?: string): Promise<SeoAuditResult> {
  const checks: SeoCheck[] = [];

  // ── Fetch the page ──────────────────────────────────────────────────────────
  let html = "";
  let loadTimeMs: number | null = null;
  let finalUrl = targetUrl;
  try {
    const result = await fetchWithTiming(targetUrl);
    html = result.html;
    loadTimeMs = result.loadTimeMs;
    finalUrl = result.finalUrl;
  } catch (err) {
    // If fetch fails, return a minimal failed audit
    checks.push({
      id: "fetch_failed",
      category: "usability",
      label: "Page reachable",
      status: "fail",
      detail: `Could not fetch ${targetUrl}: ${err instanceof Error ? err.message : String(err)}`,
      recommendation: "Ensure the website is live and accessible.",
      priority: "high",
    });
    const score = 0;
    return {
      url: targetUrl,
      auditedAt: new Date(),
      overallScore: score,
      overallGrade: scoreToGrade(score),
      onPageScore: 0,
      linksScore: 0,
      usabilityScore: 0,
      performanceScore: 0,
      socialScore: 0,
      checks,
      recommendations: [{ priority: "high", text: "Ensure the website is live and accessible.", category: "usability" }],
      pageTitle: null,
      metaDescription: null,
      loadTimeMs: null,
      mobileScore: null,
    };
  }

  const $ = cheerio.load(html);

  // ── On-Page SEO Checks ──────────────────────────────────────────────────────

  // Title tag
  const title = $("title").first().text().trim();
  const titleLen = title.length;
  if (!title) {
    checks.push({ id: "title_missing", category: "onpage", label: "Title tag", status: "fail", value: "Missing", detail: "No <title> tag found.", recommendation: "Add a descriptive title tag between 50–60 characters.", fixExample: `<!-- Paste inside <head> -->
<title>Land Clearing & Forestry Mulching | Noland Earthworks | Middle & West TN</title>

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Page Title" field`, priority: "high" });
  } else if (titleLen < 30) {
    checks.push({ id: "title_short", category: "onpage", label: "Title tag length", status: "warn", value: `${titleLen} chars`, detail: `Title is too short (${titleLen} chars): "${title}"`, recommendation: "Expand the title to 50–60 characters with primary keywords.", fixExample: `<!-- Aim for 50–60 characters, include primary keyword + location -->
<title>Land Clearing & Forestry Mulching | Middle & West Tennessee</title>

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Page Title" field`, priority: "medium" });
  } else if (titleLen > 65) {
    checks.push({ id: "title_long", category: "onpage", label: "Title tag length", status: "warn", value: `${titleLen} chars`, detail: `Title is too long (${titleLen} chars) and may be truncated in search results.`, recommendation: "Trim the title to under 60 characters.", fixExample: `<!-- Trim to under 60 characters — Google truncates at ~60 chars -->
<!-- Example (≤60 chars): -->
<title>Land Clearing & Forestry Mulching | Noland Earthworks</title>

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Page Title" field`, priority: "medium" });
  } else {
    checks.push({ id: "title_ok", category: "onpage", label: "Title tag", status: "pass", value: `${titleLen} chars`, detail: `Title is well-formed: "${title}"`, priority: "high" });
  }

  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const descLen = metaDesc.length;
  if (!metaDesc) {
    checks.push({ id: "meta_desc_missing", category: "onpage", label: "Meta description", status: "fail", value: "Missing", detail: "No meta description tag found.", recommendation: "Add a meta description between 150–160 characters summarizing the page.", fixExample: `<!-- Paste inside <head> -->
<meta name="description" content="Veteran-owned land clearing and forestry mulching serving Middle & West Tennessee. We clear brush, reclaim pasture, and prep sites — no debris piles, no hauling. Free estimates.">

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Description" field`, priority: "high" });
  } else if (descLen < 70) {
    checks.push({ id: "meta_desc_short", category: "onpage", label: "Meta description length", status: "warn", value: `${descLen} chars`, detail: `Meta description is short (${descLen} chars).`, recommendation: "Expand the meta description to 150–160 characters.", fixExample: `<!-- Expand to 150–160 characters with service + location + CTA -->
<meta name="description" content="Veteran-owned land clearing and forestry mulching serving Middle & West Tennessee. We clear brush, reclaim pasture, and prep sites — no debris piles, no hauling. Free estimates.">

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Description" field`, priority: "medium" });
  } else if (descLen > 165) {
    checks.push({ id: "meta_desc_long", category: "onpage", label: "Meta description length", status: "warn", value: `${descLen} chars`, detail: `Meta description is too long (${descLen} chars) and may be truncated.`, recommendation: "Trim the meta description to under 160 characters.", fixExample: `<!-- Trim to 150–160 characters — Google cuts off at ~160 chars -->
<meta name="description" content="Veteran-owned land clearing and forestry mulching in Middle & West Tennessee. No debris piles, no hauling. Free estimates — call 615-406-4819.">

Squarespace: Pages → (page) → gear icon → SEO tab → "SEO Description" field`, priority: "medium" });
  } else {
    checks.push({ id: "meta_desc_ok", category: "onpage", label: "Meta description", status: "pass", value: `${descLen} chars`, detail: `Meta description is well-formed.`, priority: "high" });
  }

  // H1 tag
  const h1Tags = $("h1");
  const h1Count = h1Tags.length;
  if (h1Count === 0) {
    checks.push({ id: "h1_missing", category: "onpage", label: "H1 tag", status: "fail", value: "Missing", detail: "No H1 heading found on the page.", recommendation: "Add a single H1 tag containing your primary keyword.", fixExample: `<!-- Add one H1 per page with your primary keyword -->
<h1>Land Clearing & Forestry Mulching in Middle & West Tennessee</h1>

Squarespace: Edit page → click the main heading text block → change its style to Heading 1 in the text toolbar`, priority: "high" });
  } else if (h1Count > 1) {
    checks.push({ id: "h1_multiple", category: "onpage", label: "H1 tag", status: "warn", value: `${h1Count} found`, detail: `Multiple H1 tags found (${h1Count}). Best practice is one H1 per page.`, recommendation: "Consolidate to a single H1 tag.", fixExample: `<!-- Keep only ONE H1 — your primary keyword heading -->
<h1>Land Clearing & Forestry Mulching in Middle & West Tennessee</h1>
<!-- Change all other H1s to H2 or H3 -->

Squarespace: Edit page → click each heading block → in the text toolbar, change any extra "Heading 1" styles to "Heading 2"`, priority: "medium" });
  } else {
    checks.push({ id: "h1_ok", category: "onpage", label: "H1 tag", status: "pass", value: h1Tags.first().text().trim().slice(0, 60), detail: "Single H1 tag found.", priority: "high" });
  }

  // H2 tags
  const h2Count = $("h2").length;
  if (h2Count === 0) {
    checks.push({ id: "h2_missing", category: "onpage", label: "H2 tags", status: "warn", value: "None", detail: "No H2 subheadings found.", recommendation: "Add H2 subheadings to structure your content and include secondary keywords.", fixExample: `<!-- Add H2 subheadings to break up content and include secondary keywords -->
<h2>What Is Forestry Mulching?</h2>
<h2>Our Land Clearing Process</h2>
<h2>Service Areas in Tennessee</h2>

Squarespace: Edit page → add Text blocks → format each section title as "Heading 2" in the text toolbar`, priority: "medium" });
  } else {
    checks.push({ id: "h2_ok", category: "onpage", label: "H2 tags", status: "pass", value: `${h2Count} found`, detail: `${h2Count} H2 subheadings found.`, priority: "low" });
  }

  // Image alt tags
  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt") || $(el).attr("alt")?.trim() === "");
  const altMissing = imagesWithoutAlt.length;
  const totalImages = images.length;
  if (totalImages === 0) {
    checks.push({ id: "images_none", category: "onpage", label: "Image alt tags", status: "warn", value: "No images", detail: "No images found on the page.", recommendation: "Add relevant before/after job photos with descriptive alt text.", fixExample: `<!-- Add real job photos with descriptive alt text -->
<img src="land-clearing-maury-county.jpg" alt="Land clearing job in Maury County, Tennessee — before and after">

Squarespace: Edit page → click "+" to add a block → choose "Image" → upload your photo → set Alt Text in Image Settings`, priority: "low" });
  } else if (altMissing > 0) {
    checks.push({ id: "alt_missing", category: "onpage", label: "Image alt tags", status: altMissing > totalImages / 2 ? "fail" : "warn", value: `${altMissing}/${totalImages} missing`, detail: `${altMissing} of ${totalImages} images are missing alt text.`, recommendation: "Add descriptive alt text to all images for accessibility and SEO.", fixExample: `<!-- Add descriptive alt text to every image -->
<img src="before-after-land-clearing.jpg" alt="Before and after land clearing in Maury County, Tennessee">
<img src="forestry-mulcher.jpg" alt="Tracked forestry mulcher clearing dense cedar brush in Middle Tennessee">

Squarespace: Edit page → click any image block → click the image → "Image Settings" panel → fill in the "Alt Text" field`, priority: "medium" });
  } else {
    checks.push({ id: "alt_ok", category: "onpage", label: "Image alt tags", status: "pass", value: `${totalImages} images`, detail: "All images have alt text.", priority: "medium" });
  }

  // Canonical tag
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    checks.push({ id: "canonical_missing", category: "onpage", label: "Canonical tag", status: "warn", value: "Missing", detail: "No canonical tag found.", recommendation: "Add a canonical tag to prevent duplicate content issues.", fixExample: `<!-- Paste inside <head> — use the full URL of this page -->
<link rel="canonical" href="https://nolandearthworks.com/">

Squarespace: Settings → Advanced → Code Injection → Header
Paste the tag above, replacing the URL with this page's full URL.
(Squarespace adds canonical tags automatically on most plans — verify in page source first.)`, priority: "medium" });
  } else {
    checks.push({ id: "canonical_ok", category: "onpage", label: "Canonical tag", status: "pass", value: canonical.slice(0, 60), detail: `Canonical tag present: ${canonical}`, priority: "medium" });
  }

  // Structured data / Schema.org
  const schemaScripts = $('script[type="application/ld+json"]');
  if (schemaScripts.length === 0) {
    checks.push({ id: "schema_missing", category: "onpage", label: "Structured data (Schema.org)", status: "warn", value: "None", detail: "No JSON-LD structured data found.", recommendation: "Add LocalBusiness schema markup to improve Google rich results and local SEO.", fixExample: `<!-- Paste inside <head> via Squarespace Code Injection -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Noland Earthworks, LLC",
  "telephone": "+16154064819",
  "url": "https://nolandearthworks.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Vanleer",
    "addressRegion": "TN",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 36.25, "longitude": -87.47 },
  "areaServed": "Middle and West Tennessee"
}
</script>

Squarespace: Settings → Advanced → Code Injection → Header → paste the script block above`, priority: "high" });
  } else {
    checks.push({ id: "schema_ok", category: "onpage", label: "Structured data (Schema.org)", status: "pass", value: `${schemaScripts.length} block(s)`, detail: `${schemaScripts.length} JSON-LD structured data block(s) found.`, priority: "high" });
  }

  // robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  if (robotsMeta.includes("noindex")) {
    checks.push({ id: "noindex", category: "onpage", label: "robots meta", status: "fail", value: robotsMeta, detail: "Page has noindex directive — search engines will not index this page.", recommendation: "Remove the noindex directive unless intentional.", fixExample: `<!-- Remove or replace the noindex meta tag -->
<!-- Current (blocking indexing): -->
<meta name="robots" content="noindex">

<!-- Replace with (allows indexing): -->
<meta name="robots" content="index, follow">

Squarespace: Pages → (page) → gear icon → SEO tab → uncheck "Hide this page from search engines"`, priority: "high" });
  } else {
    checks.push({ id: "robots_ok", category: "onpage", label: "robots meta", status: "pass", value: robotsMeta || "not set (indexable)", detail: "Page is indexable by search engines.", priority: "high" });
  }

  // Keyword density — check for key terms
  const bodyText = $("body").text().toLowerCase();
  const keyTerms = ["forestry mulching", "land clearing", "tennessee", "noland earthworks"];
  const foundTerms = keyTerms.filter((t) => bodyText.includes(t));
  if (foundTerms.length < 2) {
    checks.push({ id: "keywords_sparse", category: "onpage", label: "Primary keywords", status: "warn", value: `${foundTerms.length}/${keyTerms.length} found`, detail: `Only ${foundTerms.length} of ${keyTerms.length} key terms found in body text.`, recommendation: "Ensure primary keywords (forestry mulching, land clearing, Tennessee) appear naturally in page content.", fixExample: `Key terms to include naturally in your page body text:

- "forestry mulching" — use in intro paragraph and at least one subheading
- "land clearing" — use in H1, intro, and service description
- "Tennessee" or "Middle Tennessee" / "West Tennessee" — use in location context
- "Noland Earthworks" — use in at least one paragraph

Squarespace: Edit page → click each text block → naturally work these terms into your content. Do not stuff — aim for 1–3 uses of each term per page.`, priority: "high" });
  } else {
    checks.push({ id: "keywords_ok", category: "onpage", label: "Primary keywords", status: "pass", value: `${foundTerms.length}/${keyTerms.length} found`, detail: `Primary keywords found: ${foundTerms.join(", ")}.`, priority: "high" });
  }

  // ── Links Checks ────────────────────────────────────────────────────────────

  const allLinks = $("a[href]");
  const internalLinks = allLinks.filter((_, el) => {
    const href = $(el).attr("href") ?? "";
    return href.startsWith("/") || href.includes("nolandearthworks.com");
  });
  const externalLinks = allLinks.filter((_, el) => {
    const href = $(el).attr("href") ?? "";
    return href.startsWith("http") && !href.includes("nolandearthworks.com");
  });

  checks.push({
    id: "internal_links",
    category: "links",
    label: "Internal links",
    status: internalLinks.length >= 3 ? "pass" : internalLinks.length >= 1 ? "warn" : "fail",
    value: `${internalLinks.length} found`,
    detail: `${internalLinks.length} internal link(s) found on the page.`,
    recommendation: internalLinks.length < 3 ? "Add more internal links to help search engines discover other pages." : undefined,
    fixExample: internalLinks.length < 3 ? `<!-- Add internal links to related pages -->
<a href="/services/forestry-mulching">Learn about our forestry mulching service</a>
<a href="/service-areas/maury-county">Serving Maury County, TN</a>
<a href="/quote">Get a free estimate</a>

Squarespace: Edit page → highlight text you want to link → click the link icon in the toolbar → type the page URL (e.g. /services/forestry-mulching)` : undefined,
    priority: "medium",
  });

  checks.push({
    id: "external_links",
    category: "links",
    label: "External links",
    status: "pass",
    value: `${externalLinks.length} found`,
    detail: `${externalLinks.length} external link(s) found.`,
    priority: "low",
  });

  // External link rel=noopener (security, not SEO) — only check for noopener, not nofollow
  const noopenExternal = externalLinks.filter((_, el) => ($(el).attr("rel") ?? "").includes("noopener")).length;
  if (externalLinks.length > 0 && noopenExternal === 0) {
    checks.push({ id: "noopener_external", category: "links", label: "External link security (noopener)", status: "warn", value: "No noopener", detail: "External links do not have rel=\"noopener\". This is a security best practice.", recommendation: "Add rel=\"noopener noreferrer\" to external links that open in a new tab.", fixExample: `<!-- Add rel="noopener noreferrer" to external links that open in a new tab -->
<!-- Before: -->
<a href="https://example.com" target="_blank">Visit site</a>

<!-- After: -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit site</a>

Squarespace: Squarespace handles this automatically for standard link blocks. For any custom HTML Code Blocks with external links, add rel="noopener noreferrer" manually.`, priority: "low" });
  } else {
    checks.push({ id: "noopener_ok", category: "links", label: "External link security (noopener)", status: "pass", value: `${noopenExternal} noopener`, detail: "External links have rel=\"noopener\" for security.", priority: "low" });
  }

  // ── Usability Checks ────────────────────────────────────────────────────────

  // HTTPS
  const isHttps = finalUrl.startsWith("https://");
  checks.push({
    id: "https",
    category: "usability",
    label: "HTTPS / SSL",
    status: isHttps ? "pass" : "fail",
    value: isHttps ? "Enabled" : "Not enabled",
    detail: isHttps ? "Site is served over HTTPS." : "Site is not using HTTPS.",
    recommendation: isHttps ? undefined : "Enable HTTPS/SSL immediately — it is a Google ranking factor.",
    priority: "high",
  });

  // Viewport meta tag
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    checks.push({ id: "viewport_missing", category: "usability", label: "Viewport meta tag", status: "fail", value: "Missing", detail: "No viewport meta tag found. Page may not be mobile-friendly.", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.", fixExample: `<!-- Paste inside <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1">

Squarespace: Settings → Advanced → Code Injection → Header → paste the tag above.
(Squarespace normally adds this automatically — verify it is not being overridden by a custom code block.)`, priority: "high" });
  } else {
    checks.push({ id: "viewport_ok", category: "usability", label: "Viewport meta tag", status: "pass", value: viewport.slice(0, 50), detail: "Viewport meta tag is present.", priority: "high" });
  }

  // Page size
  const pageSizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
  if (pageSizeKb > 500) {
      checks.push({ id: "page_size_large", category: "usability", label: "Page size", status: "warn", value: `${pageSizeKb} KB`, detail: `Page HTML is ${pageSizeKb} KB — large pages can slow load times.`, recommendation: "Reduce page size by minifying HTML and removing unused code.", fixExample: `Page HTML is ${pageSizeKb} KB — steps to reduce it:

1. Remove unused sections and hidden blocks from the Squarespace page editor
2. Avoid embedding large inline scripts or styles in Code Injection blocks
3. Replace large embedded HTML tables with native Squarespace content blocks
4. Review Code Injection for duplicate or unused scripts:
   Squarespace → Settings → Advanced → Code Injection → review Header and Footer`, priority: "medium" });
  } else {
    checks.push({ id: "page_size_ok", category: "usability", label: "Page size", status: "pass", value: `${pageSizeKb} KB`, detail: `Page HTML is ${pageSizeKb} KB.`, priority: "medium" });
  }

  // Load time
  if (loadTimeMs !== null) {
    // Note: loadTimeMs is measured by Puppeteer waiting for networkidle2 (all network requests settle).
    // This includes third-party scripts (Analytics, Maps, etc.) and is NOT user-perceived load time.
    // Thresholds are adjusted: 20s = fail (genuinely broken), 14s = warn (heavy third-party load).
    if (loadTimeMs > 20000) {
      checks.push({ id: "load_slow", category: "usability", label: "Page load time", status: "fail", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page took ${(loadTimeMs / 1000).toFixed(1)}s to load — this is slow.`, recommendation: "Optimize images, enable caching, and consider a CDN to reduce load time.", fixExample: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s — steps to improve:

1. Compress all images before uploading (use squoosh.app or TinyPNG — target under 200 KB per image)
2. In Squarespace image blocks, enable lazy loading in image settings
3. Remove unused third-party scripts: Settings → Advanced → Code Injection
4. Avoid autoplay videos on page load — use a click-to-play poster image instead
5. Squarespace's built-in CDN handles most static assets automatically`, priority: "high" });
    } else if (loadTimeMs > 14000) {
      checks.push({ id: "load_moderate", category: "usability", label: "Page load time", status: "warn", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s — acceptable but could be faster.`, recommendation: "Target under 2 seconds for optimal user experience.", fixExample: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s — to get under 2 seconds:

1. Compress images (squoosh.app or TinyPNG — target under 150 KB per image)
2. Enable lazy loading on below-fold images in Squarespace image block settings
3. Defer non-critical third-party scripts by adding defer in Code Injection:
   <script defer src="your-script.js"></script>
4. Check for large hero videos — consider a compressed WebM or a static image fallback`, priority: "medium" });
    } else {
      checks.push({ id: "load_ok", category: "usability", label: "Page load time", status: "pass", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s.`, priority: "medium" });
    }
  }

  // Charset declaration
  const charset = $('meta[charset]').attr("charset") ?? $('meta[http-equiv="Content-Type"]').attr("content");
  if (!charset) {
    checks.push({ id: "charset_missing", category: "usability", label: "Character encoding", status: "warn", value: "Not declared", detail: "No charset meta tag found.", recommendation: "Add <meta charset=\"UTF-8\"> to the <head>.", fixExample: `<!-- Paste inside <head> -->
<meta charset="UTF-8">

Squarespace: Settings → Advanced → Code Injection → Header → paste the tag above.
(Squarespace normally includes this automatically — verify it is not being removed by a custom template override.)`, priority: "low" });
  } else {
    checks.push({ id: "charset_ok", category: "usability", label: "Character encoding", status: "pass", value: "UTF-8", detail: "Character encoding declared.", priority: "low" });
  }

  // ── Performance Checks ──────────────────────────────────────────────────────

  // Fetch PageSpeed score (may be null if API unavailable)
  const { mobile: mobileScore } = await fetchPageSpeedScore(targetUrl, googleApiKey);

  if (mobileScore !== null) {
    if (mobileScore >= 90) {
      checks.push({ id: "pagespeed_mobile", category: "performance", label: "PageSpeed mobile score", status: "pass", value: `${mobileScore}/100`, detail: `Google PageSpeed mobile score: ${mobileScore}/100.`, priority: "high" });
    } else if (mobileScore >= 50) {
      checks.push({ id: "pagespeed_mobile", category: "performance", label: "PageSpeed mobile score", status: "warn", value: `${mobileScore}/100`, detail: `Google PageSpeed mobile score: ${mobileScore}/100 — needs improvement.`, recommendation: "Optimize images, reduce JavaScript, and enable browser caching.", fixExample: `PageSpeed mobile score: ${mobileScore}/100 — top fixes:

1. Compress images: use squoosh.app → WebP format, quality 80, max 1200px wide
2. Enable lazy loading on below-fold images (Squarespace image block → settings)
3. Defer non-critical scripts in Code Injection:
   <script defer src="your-analytics.js"></script>
4. Remove unused Code Injection scripts (Settings → Advanced → Code Injection)
5. Full audit: https://pagespeed.web.dev/?url=https://nolandearthworks.com`, priority: "high" });
    } else {
      checks.push({ id: "pagespeed_mobile", category: "performance", label: "PageSpeed mobile score", status: "fail", value: `${mobileScore}/100`, detail: `Google PageSpeed mobile score: ${mobileScore}/100 — poor performance.`, recommendation: "Significant performance improvements needed. Consider image compression, lazy loading, and script deferral.", fixExample: `PageSpeed mobile score: ${mobileScore}/100 — critical fixes needed:

1. Compress ALL images before uploading:
   - Use squoosh.app → WebP, quality 75–80, max 1200px wide
   - Target: under 100 KB per image
2. Remove autoplay/background videos — replace with a static compressed image
3. Audit Code Injection for heavy third-party scripts:
   Squarespace → Settings → Advanced → Code Injection → remove anything not essential
4. Enable lazy loading on all images below the fold
5. Full report: https://pagespeed.web.dev/?url=https://nolandearthworks.com`, priority: "high" });
    }
  } else {
    checks.push({ id: "pagespeed_unavailable", category: "performance", label: "PageSpeed mobile score", status: "warn", value: "Unavailable", detail: "Could not retrieve PageSpeed score — API may be rate-limited.", priority: "high" });
  }

  // Check for render-blocking resources
  const renderBlockingScripts = $('head script:not([async]):not([defer]):not([type="application/ld+json"])').length;
  if (renderBlockingScripts > 0) {
    checks.push({ id: "render_blocking", category: "performance", label: "Render-blocking scripts", status: "warn", value: `${renderBlockingScripts} found`, detail: `${renderBlockingScripts} render-blocking script(s) in <head>.`, recommendation: "Add async or defer attributes to non-critical scripts.", fixExample: `<!-- Add async or defer to non-critical scripts in <head> -->
<!-- Before (render-blocking): -->
<script src="analytics.js"></script>

<!-- After (non-blocking): -->
<script defer src="analytics.js"></script>
<!-- or for scripts that don't depend on DOM order: -->
<script async src="analytics.js"></script>

Squarespace: Settings → Advanced → Code Injection → Header → find any <script> tags and add defer or async`, priority: "medium" });
  } else {
    checks.push({ id: "render_blocking_ok", category: "performance", label: "Render-blocking scripts", status: "pass", value: "None", detail: "No render-blocking scripts found in <head>.", priority: "medium" });
  }

  // Lazy loading for images
  const lazyImages = $('img[loading="lazy"]').length;
  if (totalImages > 3 && lazyImages === 0) {
    checks.push({ id: "lazy_loading", category: "performance", label: "Image lazy loading", status: "warn", value: "None", detail: `${totalImages} images found but none use loading="lazy".`, recommendation: 'Add loading="lazy" to below-fold images to improve page load speed.', fixExample: `<!-- Add loading="lazy" to images not visible on initial page load -->
<!-- Before: -->
<img src="job-photo.jpg" alt="Land clearing job">

<!-- After: -->
<img src="job-photo.jpg" alt="Land clearing job" loading="lazy">

Squarespace: For standard image blocks, Squarespace handles lazy loading automatically on modern plans.
For images in custom Code Blocks, add loading="lazy" to each <img> tag manually.`, priority: "medium" });
  } else if (totalImages > 0) {
    checks.push({ id: "lazy_loading_ok", category: "performance", label: "Image lazy loading", status: "pass", value: `${lazyImages}/${totalImages} lazy`, detail: `${lazyImages} of ${totalImages} images use lazy loading.`, priority: "medium" });
  }

  // ── Social Checks ───────────────────────────────────────────────────────────

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogType = $('meta[property="og:type"]').attr("content");

  const ogCount = [ogTitle, ogDesc, ogImage, ogType].filter(Boolean).length;
  if (ogCount === 0) {
    checks.push({ id: "og_missing", category: "social", label: "Open Graph tags", status: "fail", value: "None", detail: "No Open Graph tags found. Facebook and LinkedIn will not show rich previews.", recommendation: "Add og:title, og:description, og:image, and og:type tags.", fixExample: `<!-- Paste inside <head> via Squarespace Code Injection -->
<meta property="og:type" content="website">
<meta property="og:title" content="Land Clearing & Forestry Mulching | Noland Earthworks">
<meta property="og:description" content="Veteran-owned land clearing and forestry mulching in Middle & West Tennessee. Free estimates — call 615-406-4819.">
<meta property="og:image" content="https://nolandearthworks.com/images/og-image.jpg">
<meta property="og:url" content="https://nolandearthworks.com">

Squarespace: Settings → Advanced → Code Injection → Header → paste all five tags above.
For og:image, upload a 1200×630 px photo to your Squarespace media library and use its full URL.`, priority: "high" });
  } else if (ogCount < 4) {
    checks.push({ id: "og_incomplete", category: "social", label: "Open Graph tags", status: "warn", value: `${ogCount}/4 found`, detail: `Only ${ogCount} of 4 recommended Open Graph tags found.`, recommendation: "Add missing og:title, og:description, og:image, and og:type tags.", fixExample: `<!-- Add the missing Open Graph tags inside <head> -->
<!-- Required set (add any that are missing): -->
<meta property="og:type" content="website">
<meta property="og:title" content="Land Clearing & Forestry Mulching | Noland Earthworks">
<meta property="og:description" content="Veteran-owned land clearing and forestry mulching in Middle & West Tennessee. Free estimates.">
<meta property="og:image" content="https://nolandearthworks.com/images/og-image.jpg">

Squarespace: Settings → Advanced → Code Injection → Header → paste any missing tags above`, priority: "medium" });
  } else {
    checks.push({ id: "og_ok", category: "social", label: "Open Graph tags", status: "pass", value: `${ogCount}/4 found`, detail: "All key Open Graph tags present.", priority: "high" });
  }

  // Twitter Card
  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  if (!twitterCard) {
    checks.push({ id: "twitter_card_missing", category: "social", label: "Twitter Card tags", status: "warn", value: "Missing", detail: "No Twitter Card tags found.", recommendation: "Add twitter:card, twitter:title, and twitter:description tags.", fixExample: `<!-- Paste inside <head> via Squarespace Code Injection -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Land Clearing & Forestry Mulching | Noland Earthworks">
<meta name="twitter:description" content="Veteran-owned land clearing and forestry mulching in Middle & West Tennessee. Free estimates.">
<meta name="twitter:image" content="https://nolandearthworks.com/images/og-image.jpg">

Squarespace: Settings → Advanced → Code Injection → Header → paste all four tags above`, priority: "medium" });
  } else {
    checks.push({ id: "twitter_card_ok", category: "social", label: "Twitter Card tags", status: "pass", value: twitterCard, detail: `Twitter Card type: ${twitterCard}.`, priority: "medium" });
  }

  // ── Advanced On-Page Checks ────────────────────────────────────────────────

  // H1 keyword match
  const h1Text = h1Tags.first().text().toLowerCase();
  const h1Keywords = ["land clearing", "forestry mulching", "land management", "vegetation", "site prep"];
  const h1HasKeyword = h1Keywords.some((k) => h1Text.includes(k));
  if (h1Count > 0 && !h1HasKeyword) {
    checks.push({ id: "h1_keyword", category: "onpage", label: "H1 keyword relevance", status: "warn", value: h1Text.slice(0, 60), detail: "H1 tag does not contain a primary service keyword.", recommendation: "Include a primary keyword (land clearing, forestry mulching, etc.) in the H1 heading.", fixExample: `<!-- Update your H1 to include a primary service keyword -->
<!-- Current H1: "${h1Text.slice(0, 80)}" -->

<!-- Suggested H1 examples: -->
<h1>Land Clearing & Forestry Mulching in Middle & West Tennessee</h1>
<h1>Professional Forestry Mulching — Noland Earthworks</h1>
<h1>Tennessee Land Clearing You Can Count On</h1>

Squarespace: Edit page → click the main heading text block → update the text to include your primary keyword → ensure it is styled as Heading 1 in the toolbar`, priority: "high" });
  } else if (h1Count > 0) {
    checks.push({ id: "h1_keyword_ok", category: "onpage", label: "H1 keyword relevance", status: "pass", value: h1Text.slice(0, 60), detail: "H1 contains a primary service keyword.", priority: "high" });
  }

  // Page word count
  const pageText = $('body').clone().find('script, style, nav, footer, header').remove().end().text();
  const wordCount = pageText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    checks.push({ id: "word_count_low", category: "onpage", label: "Page word count", status: "fail", value: `${wordCount} words`, detail: `Page has only ${wordCount} words — thin content is a negative ranking signal.`, recommendation: "Expand page content to at least 600 words with relevant service descriptions, FAQs, and local area context.", fixExample: `Current word count: ${wordCount} words — target: 600+ words

Content sections to add (each adds ~100–150 words):

1. Service description paragraph:
   "Forestry mulching is the most efficient way to clear land in Tennessee..."

2. How it works (3-step process):
   Step 1: Site assessment → Step 2: Mulching → Step 3: Clean finish

3. Why choose us:
   Veteran-owned, tracked equipment handles any terrain, no debris hauling required

4. Service area paragraph:
   "We serve landowners across Middle and West Tennessee, including [county names]..."

5. FAQ section (2–3 questions):
   Q: How long does land clearing take?
   Q: Do you remove the debris?
   Q: What size properties do you work on?

Squarespace: Edit page → add Text blocks between existing sections → write naturally, include keywords organically`, priority: "high" });
  } else if (wordCount < 600) {
    checks.push({ id: "word_count_short", category: "onpage", label: "Page word count", status: "warn", value: `${wordCount} words`, detail: `Page has ${wordCount} words — Google prefers 600+ for service pages.`, recommendation: "Add more content: service details, process explanation, FAQs, or local area context.", fixExample: `Current word count: ${wordCount} words — target: 600+ words

Quick content additions to reach 600 words:

1. Add a 2–3 sentence intro paragraph explaining the service and its benefits
2. Add a "How It Works" section (3 short steps, ~50 words each)
3. Add a 2-question FAQ at the bottom:
   Q: Do you haul away debris? A: No — forestry mulching grinds everything into mulch that stays on-site.
   Q: What size properties do you work on? A: We specialize in 2–20 acre jobs.

Squarespace: Edit page → click "+" between sections → add Text blocks → write the content above`, priority: "medium" });
  } else {
    checks.push({ id: "word_count_ok", category: "onpage", label: "Page word count", status: "pass", value: `${wordCount} words`, detail: `Page has ${wordCount} words — good content depth.`, priority: "medium" });
  }

  // lang attribute on html tag
  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    checks.push({ id: "lang_missing", category: "onpage", label: "HTML lang attribute", status: "warn", value: "Missing", detail: "The <html> tag does not have a lang attribute.", recommendation: 'Add lang="en" to the <html> tag: <html lang="en">.', fixExample: `Squarespace does not let you edit the <html> tag directly.
Workaround — inject lang="en" via JavaScript in Code Injection:

Squarespace: Settings → Advanced → Code Injection → Header
Paste this script:

<script>
  document.documentElement.setAttribute('lang', 'en');
</script>

This runs before the page renders and sets lang="en" on the <html> tag.`, priority: "medium" });
  } else {
    checks.push({ id: "lang_ok", category: "onpage", label: "HTML lang attribute", status: "pass", value: htmlLang, detail: `HTML lang attribute set to "${htmlLang}".`, priority: "medium" });
  }

  // LocalBusiness JSON-LD field validation
  let localBusinessValid = false;
  let localBusinessDetail = "No LocalBusiness JSON-LD block found.";
  schemaScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        const entryType = entry["@type"];
        const typeList = Array.isArray(entryType) ? entryType : [entryType];
        if (typeList.includes("LocalBusiness") || typeList.includes("HomeAndConstructionBusiness")) {
          const hasName = !!entry.name;
          const hasAddress = !!entry.address;
          const hasPhone = !!entry.telephone;
          const hasArea = !!entry.areaServed;
          const hasGeo = !!entry.geo;
          const missing = [!hasName && "name", !hasAddress && "address", !hasPhone && "telephone", !hasArea && "areaServed", !hasGeo && "geo"].filter(Boolean);
          if (missing.length === 0) {
            localBusinessValid = true;
            localBusinessDetail = "LocalBusiness JSON-LD has all required fields (name, address, telephone, areaServed, geo).";
          } else {
            localBusinessDetail = `LocalBusiness JSON-LD is missing: ${missing.join(", ")}.`;
          }
        }
      }
    } catch {}
  });
  if (localBusinessValid) {
    checks.push({ id: "local_business_schema_ok", category: "onpage", label: "LocalBusiness JSON-LD validation", status: "pass", value: "Valid", detail: localBusinessDetail, priority: "high" });
  } else {
    checks.push({ id: "local_business_schema_invalid", category: "onpage", label: "LocalBusiness JSON-LD validation", status: schemaScripts.length > 0 ? "warn" : "fail", value: "Incomplete", detail: localBusinessDetail, recommendation: "Add or complete LocalBusiness JSON-LD with name, address, telephone, areaServed, and geo fields for local SEO.", fixExample: `<!-- Complete LocalBusiness JSON-LD — paste in Squarespace Code Injection → Header -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Noland Earthworks, LLC",
  "telephone": "+16154064819",
  "url": "https://nolandearthworks.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "",
    "addressLocality": "Vanleer",
    "addressRegion": "TN",
    "postalCode": "37181",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 36.25,
    "longitude": -87.47
  },
  "areaServed": "Middle and West Tennessee",
  "description": "Veteran-owned land clearing and forestry mulching serving Middle & West Tennessee."
}
</script>

Missing fields detected: ${localBusinessDetail}`, priority: "high" });
  }

  // Sitemap.xml reachability
  const sitemapUrl = new URL("/sitemap.xml", finalUrl).href;
  try {
    const sitemapRes = await fetch(sitemapUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (sitemapRes.ok) {
      checks.push({ id: "sitemap_ok", category: "onpage", label: "sitemap.xml", status: "pass", value: "Reachable", detail: `sitemap.xml is accessible at ${sitemapUrl}.`, priority: "high" });
    } else {
      checks.push({ id: "sitemap_missing", category: "onpage", label: "sitemap.xml", status: "warn", value: `HTTP ${sitemapRes.status}`, detail: `sitemap.xml returned HTTP ${sitemapRes.status}.`, recommendation: "Ensure sitemap.xml is accessible at /sitemap.xml and submitted to Google Search Console.", fixExample: `sitemap.xml returned HTTP ${sitemapRes.status} — steps to fix:

1. Squarespace generates a sitemap automatically at /sitemap.xml
   Verify by visiting: https://nolandearthworks.com/sitemap.xml

2. If it returns an error, check:
   - Site is not in "Private" mode: Settings → Site Availability → set to Public
   - No password protection on the site

3. Once confirmed working, submit to Google Search Console:
   search.google.com/search-console → Sitemaps → enter "sitemap.xml" → Submit`, priority: "high" });
    }
  } catch {
    checks.push({ id: "sitemap_unreachable", category: "onpage", label: "sitemap.xml", status: "warn", value: "Unreachable", detail: "Could not reach sitemap.xml — it may not exist or be blocked.", recommendation: "Create and publish a sitemap.xml at /sitemap.xml and submit it to Google Search Console.", fixExample: `Could not reach sitemap.xml — steps to fix:

1. Squarespace auto-generates a sitemap at /sitemap.xml
   Verify by visiting: https://nolandearthworks.com/sitemap.xml

2. If it is not accessible:
   - Ensure site is Public: Settings → Site Availability → Public
   - Ensure no site-wide password is set
   - Check robots.txt is not blocking /sitemap.xml

3. Submit to Google Search Console once working:
   search.google.com/search-console → Sitemaps → enter "sitemap.xml" → Submit`, priority: "high" });
  }

  // robots.txt reachability and content
  const robotsUrl = new URL("/robots.txt", finalUrl).href;
  try {
    const robotsRes = await fetch(robotsUrl, { signal: AbortSignal.timeout(8000) });
    if (robotsRes.ok) {
      const robotsText = await robotsRes.text();
      const hasSitemapRef = robotsText.toLowerCase().includes("sitemap:");
      if (hasSitemapRef) {
        checks.push({ id: "robots_txt_ok", category: "onpage", label: "robots.txt", status: "pass", value: "Valid + Sitemap ref", detail: "robots.txt is accessible and references the sitemap.", priority: "medium" });
      } else {
        checks.push({ id: "robots_no_sitemap", category: "onpage", label: "robots.txt", status: "warn", value: "No sitemap ref", detail: "robots.txt exists but does not reference the sitemap.", recommendation: "Add 'Sitemap: https://nolandearthworks.com/sitemap.xml' to robots.txt.", fixExample: `Add a Sitemap reference to your robots.txt.

Squarespace does not have a built-in robots.txt editor.
Workaround using URL Mappings:

1. Squarespace → Settings → Advanced → URL Mappings → add:
   /robots.txt -> /robots-page 301

2. Create a new page with URL slug "robots-page"

3. Add a Code Block to that page with this content:
   User-agent: *
   Allow: /
   Sitemap: https://nolandearthworks.com/sitemap.xml

Note: Squarespace's default robots.txt already allows all crawlers. This workaround adds the Sitemap reference.`, priority: "medium" });
      }
    } else {
      checks.push({ id: "robots_missing", category: "onpage", label: "robots.txt", status: "warn", value: `HTTP ${robotsRes.status}`, detail: `robots.txt returned HTTP ${robotsRes.status}.`, recommendation: "Create a robots.txt file at /robots.txt with a Sitemap reference.", fixExample: `robots.txt returned HTTP ${robotsRes.status}.

Squarespace generates a basic robots.txt automatically.
If it is missing or returning an error:

1. Verify site is Public: Settings → Site Availability → Public
2. Visit https://nolandearthworks.com/robots.txt to confirm it loads
3. Squarespace's default robots.txt allows all crawlers — this is the correct behavior
4. To add a Sitemap reference, use URL Mappings:
   Settings → Advanced → URL Mappings → /robots.txt -> /robots-page 301
   Create a page at /robots-page with a Code Block:
   User-agent: *
   Allow: /
   Sitemap: https://nolandearthworks.com/sitemap.xml`, priority: "medium" });
    }
  } catch {
    checks.push({ id: "robots_unreachable", category: "onpage", label: "robots.txt", status: "warn", value: "Unreachable", detail: "Could not reach robots.txt.", recommendation: "Create a robots.txt file at /robots.txt.", fixExample: `Could not reach robots.txt.

Squarespace should serve one automatically.

1. Verify site is Public: Settings → Site Availability → Public
2. Visit https://nolandearthworks.com/robots.txt to check
3. If still unreachable, create a custom one via URL Mappings:
   Settings → Advanced → URL Mappings → /robots.txt -> /robots-page 301
   Create a page at /robots-page with a Code Block:
   User-agent: *
   Allow: /
   Sitemap: https://nolandearthworks.com/sitemap.xml`, priority: "medium" });
  }

  // llms.txt — AI crawler visibility signal
  const llmsTxtUrl = new URL("/llms.txt", finalUrl).href;
  try {
    const llmsRes = await fetch(llmsTxtUrl, { signal: AbortSignal.timeout(8000) });
    if (llmsRes.ok) {
      checks.push({ id: "llms_txt_ok", category: "onpage", label: "llms.txt", status: "pass", value: "Found", detail: "llms.txt is present. AI crawlers (ChatGPT, Claude, Perplexity) can use it to understand your site.", priority: "low" });
    } else {
      checks.push({ id: "llms_txt_missing", category: "onpage", label: "llms.txt", status: "warn", value: `HTTP ${llmsRes.status}`, detail: "llms.txt was not found. This file helps AI search engines (ChatGPT, Claude, Perplexity) understand your site content and services.", recommendation: "Add an llms.txt file at the root of your site to improve visibility in AI-powered search results.", fixExample: `Create a file at /llms.txt with a plain-language description of your business and services.
Example content:

# Noland Earthworks

Noland Earthworks is a veteran-owned land management company based in Middle Tennessee.
Services: forestry mulching, land clearing, brush hogging.
Service area: Middle Tennessee, including Maury, Williamson, Hickman, Lewis, and surrounding counties.
Contact: nolandearthworks.com

This file helps AI assistants accurately describe your business when users ask about land clearing in Tennessee.`, priority: "low" });
    }
  } catch {
    checks.push({ id: "llms_txt_unreachable", category: "onpage", label: "llms.txt", status: "warn", value: "Unreachable", detail: "Could not reach llms.txt.", recommendation: "Add an llms.txt file at the root of your site to improve AI search visibility.", fixExample: `Create /llms.txt with a plain-language description of your business, services, and service area.`, priority: "low" });
  }

  // ── Score Calculation ───────────────────────────────────────────────────────

  const onPageScore = categoryScore(checks, "onpage");
  const linksScore = categoryScore(checks, "links");
  const usabilityScore = categoryScore(checks, "usability");
  const performanceScore = categoryScore(checks, "performance");
  const socialScore = categoryScore(checks, "social");

  // Weighted overall: on-page and usability matter most for a local service business
  const overallScore = Math.round(
    onPageScore * 0.30 +
    linksScore * 0.15 +
    usabilityScore * 0.25 +
    performanceScore * 0.20 +
    socialScore * 0.10
  );

  // Build prioritized recommendations from failed/warned checks
  const recommendations = checks
    .filter((c) => c.status !== "pass" && c.recommendation)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    })
    .map((c) => ({
      priority: c.priority,
      text: c.recommendation!,
      category: c.category,
    }));

  return {
    url: finalUrl,
    auditedAt: new Date(),
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    onPageScore,
    linksScore,
    usabilityScore,
    performanceScore,
    socialScore,
    checks,
    recommendations,
    pageTitle: title || null,
    metaDescription: metaDesc || null,
    loadTimeMs,
    mobileScore,
  };
}
