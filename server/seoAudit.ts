/**
 * SEO Audit Engine for Noland Earthworks
 * Performs a comprehensive on-page SEO audit by fetching and parsing the target URL,
 * then scoring it across five categories: On-Page SEO, Links, Usability, Performance, Social.
 */
import * as cheerio from "cheerio";

export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  id: string;
  category: "onpage" | "links" | "usability" | "performance" | "social";
  label: string;
  status: CheckStatus;
  value?: string;
  detail: string;
  recommendation?: string;
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

async function fetchWithTiming(url: string): Promise<{ html: string; loadTimeMs: number; finalUrl: string }> {
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
    checks.push({ id: "title_missing", category: "onpage", label: "Title tag", status: "fail", value: "Missing", detail: "No <title> tag found.", recommendation: "Add a descriptive title tag between 50–60 characters.", priority: "high" });
  } else if (titleLen < 30) {
    checks.push({ id: "title_short", category: "onpage", label: "Title tag length", status: "warn", value: `${titleLen} chars`, detail: `Title is too short (${titleLen} chars): "${title}"`, recommendation: "Expand the title to 50–60 characters with primary keywords.", priority: "medium" });
  } else if (titleLen > 65) {
    checks.push({ id: "title_long", category: "onpage", label: "Title tag length", status: "warn", value: `${titleLen} chars`, detail: `Title is too long (${titleLen} chars) and may be truncated in search results.`, recommendation: "Trim the title to under 60 characters.", priority: "medium" });
  } else {
    checks.push({ id: "title_ok", category: "onpage", label: "Title tag", status: "pass", value: `${titleLen} chars`, detail: `Title is well-formed: "${title}"`, priority: "high" });
  }

  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const descLen = metaDesc.length;
  if (!metaDesc) {
    checks.push({ id: "meta_desc_missing", category: "onpage", label: "Meta description", status: "fail", value: "Missing", detail: "No meta description tag found.", recommendation: "Add a meta description between 150–160 characters summarizing the page.", priority: "high" });
  } else if (descLen < 70) {
    checks.push({ id: "meta_desc_short", category: "onpage", label: "Meta description length", status: "warn", value: `${descLen} chars`, detail: `Meta description is short (${descLen} chars).`, recommendation: "Expand the meta description to 150–160 characters.", priority: "medium" });
  } else if (descLen > 165) {
    checks.push({ id: "meta_desc_long", category: "onpage", label: "Meta description length", status: "warn", value: `${descLen} chars`, detail: `Meta description is too long (${descLen} chars) and may be truncated.`, recommendation: "Trim the meta description to under 160 characters.", priority: "medium" });
  } else {
    checks.push({ id: "meta_desc_ok", category: "onpage", label: "Meta description", status: "pass", value: `${descLen} chars`, detail: `Meta description is well-formed.`, priority: "high" });
  }

  // H1 tag
  const h1Tags = $("h1");
  const h1Count = h1Tags.length;
  if (h1Count === 0) {
    checks.push({ id: "h1_missing", category: "onpage", label: "H1 tag", status: "fail", value: "Missing", detail: "No H1 heading found on the page.", recommendation: "Add a single H1 tag containing your primary keyword.", priority: "high" });
  } else if (h1Count > 1) {
    checks.push({ id: "h1_multiple", category: "onpage", label: "H1 tag", status: "warn", value: `${h1Count} found`, detail: `Multiple H1 tags found (${h1Count}). Best practice is one H1 per page.`, recommendation: "Consolidate to a single H1 tag.", priority: "medium" });
  } else {
    checks.push({ id: "h1_ok", category: "onpage", label: "H1 tag", status: "pass", value: h1Tags.first().text().trim().slice(0, 60), detail: "Single H1 tag found.", priority: "high" });
  }

  // H2 tags
  const h2Count = $("h2").length;
  if (h2Count === 0) {
    checks.push({ id: "h2_missing", category: "onpage", label: "H2 tags", status: "warn", value: "None", detail: "No H2 subheadings found.", recommendation: "Add H2 subheadings to structure your content and include secondary keywords.", priority: "medium" });
  } else {
    checks.push({ id: "h2_ok", category: "onpage", label: "H2 tags", status: "pass", value: `${h2Count} found`, detail: `${h2Count} H2 subheadings found.`, priority: "low" });
  }

  // Image alt tags
  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt") || $(el).attr("alt")?.trim() === "");
  const altMissing = imagesWithoutAlt.length;
  const totalImages = images.length;
  if (totalImages === 0) {
    checks.push({ id: "images_none", category: "onpage", label: "Image alt tags", status: "warn", value: "No images", detail: "No images found on the page.", recommendation: "Add relevant before/after job photos with descriptive alt text.", priority: "low" });
  } else if (altMissing > 0) {
    checks.push({ id: "alt_missing", category: "onpage", label: "Image alt tags", status: altMissing > totalImages / 2 ? "fail" : "warn", value: `${altMissing}/${totalImages} missing`, detail: `${altMissing} of ${totalImages} images are missing alt text.`, recommendation: "Add descriptive alt text to all images for accessibility and SEO.", priority: "medium" });
  } else {
    checks.push({ id: "alt_ok", category: "onpage", label: "Image alt tags", status: "pass", value: `${totalImages} images`, detail: "All images have alt text.", priority: "medium" });
  }

  // Canonical tag
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    checks.push({ id: "canonical_missing", category: "onpage", label: "Canonical tag", status: "warn", value: "Missing", detail: "No canonical tag found.", recommendation: "Add a canonical tag to prevent duplicate content issues.", priority: "medium" });
  } else {
    checks.push({ id: "canonical_ok", category: "onpage", label: "Canonical tag", status: "pass", value: canonical.slice(0, 60), detail: `Canonical tag present: ${canonical}`, priority: "medium" });
  }

  // Structured data / Schema.org
  const schemaScripts = $('script[type="application/ld+json"]');
  if (schemaScripts.length === 0) {
    checks.push({ id: "schema_missing", category: "onpage", label: "Structured data (Schema.org)", status: "warn", value: "None", detail: "No JSON-LD structured data found.", recommendation: "Add LocalBusiness schema markup to improve Google rich results and local SEO.", priority: "high" });
  } else {
    checks.push({ id: "schema_ok", category: "onpage", label: "Structured data (Schema.org)", status: "pass", value: `${schemaScripts.length} block(s)`, detail: `${schemaScripts.length} JSON-LD structured data block(s) found.`, priority: "high" });
  }

  // robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  if (robotsMeta.includes("noindex")) {
    checks.push({ id: "noindex", category: "onpage", label: "robots meta", status: "fail", value: robotsMeta, detail: "Page has noindex directive — search engines will not index this page.", recommendation: "Remove the noindex directive unless intentional.", priority: "high" });
  } else {
    checks.push({ id: "robots_ok", category: "onpage", label: "robots meta", status: "pass", value: robotsMeta || "not set (indexable)", detail: "Page is indexable by search engines.", priority: "high" });
  }

  // Keyword density — check for key terms
  const bodyText = $("body").text().toLowerCase();
  const keyTerms = ["forestry mulching", "land clearing", "tennessee", "noland earthworks"];
  const foundTerms = keyTerms.filter((t) => bodyText.includes(t));
  if (foundTerms.length < 2) {
    checks.push({ id: "keywords_sparse", category: "onpage", label: "Primary keywords", status: "warn", value: `${foundTerms.length}/${keyTerms.length} found`, detail: `Only ${foundTerms.length} of ${keyTerms.length} key terms found in body text.`, recommendation: "Ensure primary keywords (forestry mulching, land clearing, Tennessee) appear naturally in page content.", priority: "high" });
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

  // Check for nofollow on external links
  const nofollowExternal = externalLinks.filter((_, el) => ($(el).attr("rel") ?? "").includes("nofollow")).length;
  if (externalLinks.length > 0 && nofollowExternal === 0) {
    checks.push({ id: "nofollow_external", category: "links", label: "External link rel attributes", status: "warn", value: "No nofollow", detail: "External links do not have rel=\"nofollow\" or rel=\"noopener\".", recommendation: "Add rel=\"nofollow noopener\" to external links to control link equity.", priority: "low" });
  } else {
    checks.push({ id: "nofollow_ok", category: "links", label: "External link rel attributes", status: "pass", value: `${nofollowExternal} nofollow`, detail: "External links have appropriate rel attributes.", priority: "low" });
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
    checks.push({ id: "viewport_missing", category: "usability", label: "Viewport meta tag", status: "fail", value: "Missing", detail: "No viewport meta tag found. Page may not be mobile-friendly.", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.", priority: "high" });
  } else {
    checks.push({ id: "viewport_ok", category: "usability", label: "Viewport meta tag", status: "pass", value: viewport.slice(0, 50), detail: "Viewport meta tag is present.", priority: "high" });
  }

  // Page size
  const pageSizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
  if (pageSizeKb > 500) {
    checks.push({ id: "page_size_large", category: "usability", label: "Page size", status: "warn", value: `${pageSizeKb} KB`, detail: `Page HTML is ${pageSizeKb} KB — large pages can slow load times.`, recommendation: "Reduce page size by minifying HTML and removing unused code.", priority: "medium" });
  } else {
    checks.push({ id: "page_size_ok", category: "usability", label: "Page size", status: "pass", value: `${pageSizeKb} KB`, detail: `Page HTML is ${pageSizeKb} KB.`, priority: "medium" });
  }

  // Load time
  if (loadTimeMs !== null) {
    if (loadTimeMs > 4000) {
      checks.push({ id: "load_slow", category: "usability", label: "Page load time", status: "fail", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page took ${(loadTimeMs / 1000).toFixed(1)}s to load — this is slow.`, recommendation: "Optimize images, enable caching, and consider a CDN to reduce load time.", priority: "high" });
    } else if (loadTimeMs > 2000) {
      checks.push({ id: "load_moderate", category: "usability", label: "Page load time", status: "warn", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s — acceptable but could be faster.`, recommendation: "Target under 2 seconds for optimal user experience.", priority: "medium" });
    } else {
      checks.push({ id: "load_ok", category: "usability", label: "Page load time", status: "pass", value: `${(loadTimeMs / 1000).toFixed(1)}s`, detail: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s.`, priority: "medium" });
    }
  }

  // Charset declaration
  const charset = $('meta[charset]').attr("charset") ?? $('meta[http-equiv="Content-Type"]').attr("content");
  if (!charset) {
    checks.push({ id: "charset_missing", category: "usability", label: "Character encoding", status: "warn", value: "Not declared", detail: "No charset meta tag found.", recommendation: "Add <meta charset=\"UTF-8\"> to the <head>.", priority: "low" });
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
      checks.push({ id: "pagespeed_mobile", category: "performance", label: "PageSpeed mobile score", status: "warn", value: `${mobileScore}/100`, detail: `Google PageSpeed mobile score: ${mobileScore}/100 — needs improvement.`, recommendation: "Optimize images, reduce JavaScript, and enable browser caching.", priority: "high" });
    } else {
      checks.push({ id: "pagespeed_mobile", category: "performance", label: "PageSpeed mobile score", status: "fail", value: `${mobileScore}/100`, detail: `Google PageSpeed mobile score: ${mobileScore}/100 — poor performance.`, recommendation: "Significant performance improvements needed. Consider image compression, lazy loading, and script deferral.", priority: "high" });
    }
  } else {
    checks.push({ id: "pagespeed_unavailable", category: "performance", label: "PageSpeed mobile score", status: "warn", value: "Unavailable", detail: "Could not retrieve PageSpeed score — API may be rate-limited.", priority: "high" });
  }

  // Check for render-blocking resources
  const renderBlockingScripts = $('head script:not([async]):not([defer]):not([type="application/ld+json"])').length;
  if (renderBlockingScripts > 0) {
    checks.push({ id: "render_blocking", category: "performance", label: "Render-blocking scripts", status: "warn", value: `${renderBlockingScripts} found`, detail: `${renderBlockingScripts} render-blocking script(s) in <head>.`, recommendation: "Add async or defer attributes to non-critical scripts.", priority: "medium" });
  } else {
    checks.push({ id: "render_blocking_ok", category: "performance", label: "Render-blocking scripts", status: "pass", value: "None", detail: "No render-blocking scripts found in <head>.", priority: "medium" });
  }

  // Image count (proxy for image optimization need)
  if (totalImages > 20) {
    checks.push({ id: "image_count", category: "performance", label: "Image count", status: "warn", value: `${totalImages} images`, detail: `${totalImages} images found — ensure all are optimized and use modern formats (WebP).`, recommendation: "Compress images and use WebP format. Implement lazy loading for below-fold images.", priority: "medium" });
  } else {
    checks.push({ id: "image_count_ok", category: "performance", label: "Image count", status: "pass", value: `${totalImages} images`, detail: `${totalImages} images found — manageable count.`, priority: "low" });
  }

  // ── Social Checks ───────────────────────────────────────────────────────────

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogType = $('meta[property="og:type"]').attr("content");

  const ogCount = [ogTitle, ogDesc, ogImage, ogType].filter(Boolean).length;
  if (ogCount === 0) {
    checks.push({ id: "og_missing", category: "social", label: "Open Graph tags", status: "fail", value: "None", detail: "No Open Graph tags found. Facebook and LinkedIn will not show rich previews.", recommendation: "Add og:title, og:description, og:image, and og:type tags.", priority: "high" });
  } else if (ogCount < 4) {
    checks.push({ id: "og_incomplete", category: "social", label: "Open Graph tags", status: "warn", value: `${ogCount}/4 found`, detail: `Only ${ogCount} of 4 recommended Open Graph tags found.`, recommendation: "Add missing og:title, og:description, og:image, and og:type tags.", priority: "medium" });
  } else {
    checks.push({ id: "og_ok", category: "social", label: "Open Graph tags", status: "pass", value: `${ogCount}/4 found`, detail: "All key Open Graph tags present.", priority: "high" });
  }

  // Twitter Card
  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  if (!twitterCard) {
    checks.push({ id: "twitter_card_missing", category: "social", label: "Twitter Card tags", status: "warn", value: "Missing", detail: "No Twitter Card tags found.", recommendation: "Add twitter:card, twitter:title, and twitter:description tags.", priority: "medium" });
  } else {
    checks.push({ id: "twitter_card_ok", category: "social", label: "Twitter Card tags", status: "pass", value: twitterCard, detail: `Twitter Card type: ${twitterCard}.`, priority: "medium" });
  }

  // Social profile links on page
  const fbLink = $('a[href*="facebook.com"]').length > 0;
  const igLink = $('a[href*="instagram.com"]').length > 0;
  const socialLinksCount = [fbLink, igLink].filter(Boolean).length;
  if (socialLinksCount === 0) {
    checks.push({ id: "social_links_missing", category: "social", label: "Social profile links", status: "warn", value: "None", detail: "No links to social media profiles found on the page.", recommendation: "Add links to your Facebook and Instagram profiles.", priority: "low" });
  } else {
    checks.push({ id: "social_links_ok", category: "social", label: "Social profile links", status: "pass", value: `${socialLinksCount} found`, detail: "Social media profile links found on the page.", priority: "low" });
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
