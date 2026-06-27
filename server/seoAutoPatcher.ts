/**
 * SEO Auto-Patcher for Noland Earthworks
 *
 * For SEO checks whose fixes live in client/index.html (meta tags, OG tags,
 * Twitter Card, JSON-LD schema, canonical, charset, viewport, lang), this
 * module patches the file directly so the next audit returns a real pass.
 *
 * For checks that require Squarespace action (H1, H2, image alt tags, body
 * copy, internal links, load time), it returns a "manual" flag so the UI
 * can label them clearly.
 *
 * Check IDs match exactly what server/seoAudit.ts emits.
 */

import fs from "fs";
import path from "path";

// Resolve the index.html path relative to this server file.
// server/seoAutoPatcher.ts → ../client/index.html
const INDEX_HTML_PATH = path.resolve(__dirname, "../client/index.html");

// Check IDs that can be auto-patched in client/index.html
// These match exactly the IDs emitted by server/seoAudit.ts
export const AUTO_PATCHABLE_CHECKS = new Set([
  "title_missing",
  "title_short",
  "title_long",
  "meta_desc_missing",
  "meta_desc_short",
  "meta_desc_long",
  "canonical_missing",
  "schema_missing",
  "viewport_missing",
  "charset_missing",
  "og_missing",
  "og_incomplete",        // audit emits og_incomplete when some OG tags present but not all 4
  "twitter_card_missing",
  "lang_missing",
]);

// Check IDs that require manual Squarespace action
// These live in Squarespace page content, not in client/index.html
export const SQUARESPACE_MANUAL_CHECKS = new Set([
  "h1_missing",
  "h1_multiple",
  "h1_keyword",
  "h2_missing",
  "alt_missing",
  "images_none",
  "keywords_sparse",
  "word_count_low",
  "word_count_short",
  "internal_links",
  "noopener_external",
  "load_slow",
  "load_moderate",
  "page_size_large",
  "pagespeed_mobile",
  "noindex",
  "render_blocking",
  "lazy_loading",
]);

export type PatchResult =
  | { patched: true; description: string }
  | { patched: false; manual: true; squarespaceInstructions: string }
  | { patched: false; manual: false; reason: string };

/**
 * Attempt to auto-patch a specific SEO check in client/index.html.
 * Returns a PatchResult indicating what happened.
 */
export async function autoPatchSeoCheck(
  checkId: string,
  checkDetail: string,
  recommendation: string,
  fixSnippet: string
): Promise<PatchResult> {
  // If this is a Squarespace-only fix, return manual instructions
  if (SQUARESPACE_MANUAL_CHECKS.has(checkId)) {
    return {
      patched: false,
      manual: true,
      squarespaceInstructions: fixSnippet || recommendation,
    };
  }

  // If not auto-patchable, return a reason
  if (!AUTO_PATCHABLE_CHECKS.has(checkId)) {
    return {
      patched: false,
      manual: false,
      reason: `Check "${checkId}" does not have an auto-patch handler. Apply manually.`,
    };
  }

  // Read current index.html
  let html: string;
  try {
    html = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  } catch (err) {
    return {
      patched: false,
      manual: false,
      reason: `Could not read client/index.html: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let patched = false;
  let description = "";

  switch (checkId) {
    case "title_missing":
    case "title_short":
    case "title_long": {
      // Replace the <title> tag content
      const newTitle = "Noland Earthworks | Land Clearing & Forestry Mulching | Middle & West Tennessee";
      const updated = html.replace(/<title>[^<]*<\/title>/, `<title>${newTitle}</title>`);
      if (updated !== html) {
        html = updated;
        patched = true;
        description = `Updated <title> to: "${newTitle}"`;
      } else if (!html.includes("<title>")) {
        // Insert after <head>
        html = html.replace("<head>", `<head>\n    <title>${newTitle}</title>`);
        patched = true;
        description = `Inserted <title> tag: "${newTitle}"`;
      } else {
        // Title already present and well-formed — mark as no change needed
        patched = false;
        description = "Title tag already present and well-formed.";
      }
      break;
    }

    case "meta_desc_missing":
    case "meta_desc_short":
    case "meta_desc_long": {
      const newDesc = "Veteran-owned forestry mulching and land clearing in Middle &amp; West Tennessee. No debris piles, no hauling. Free on-site estimates. Call 615-406-4819.";
      const updated = html.replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${newDesc}" />`
      );
      if (updated !== html) {
        html = updated;
        patched = true;
        description = "Updated meta description to optimal length (150–160 chars).";
      } else {
        // Insert after charset
        html = html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta name="description" content="${newDesc}" />`
        );
        patched = true;
        description = "Inserted meta description tag.";
      }
      break;
    }

    case "canonical_missing": {
      if (!html.includes('rel="canonical"')) {
        html = html.replace(
          "</head>",
          `    <link rel="canonical" href="https://nolandearthworks.com/" />\n  </head>`
        );
        patched = true;
        description = 'Inserted canonical tag: <link rel="canonical" href="https://nolandearthworks.com/" />';
      } else {
        patched = true;
        description = "Canonical tag already present in index.html — no change needed.";
      }
      break;
    }

    case "schema_missing": {
      if (!html.includes("application/ld+json")) {
        const schema = `    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Noland Earthworks, LLC",
      "telephone": "615-406-4819",
      "url": "https://nolandearthworks.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Vanleer",
        "addressRegion": "TN",
        "addressCountry": "US"
      },
      "areaServed": "Middle and West Tennessee"
    }
    </script>`;
        html = html.replace("</head>", `${schema}\n  </head>`);
        patched = true;
        description = "Inserted LocalBusiness JSON-LD schema block.";
      } else {
        patched = true;
        description = "JSON-LD schema already present in index.html — no change needed.";
      }
      break;
    }

    case "viewport_missing": {
      if (!html.includes('name="viewport"')) {
        html = html.replace(
          '<meta charset="UTF-8" />',
          '<meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />'
        );
        patched = true;
        description = "Inserted viewport meta tag.";
      } else {
        patched = true;
        description = "Viewport meta tag already present in index.html — no change needed.";
      }
      break;
    }

    case "charset_missing": {
      if (!html.includes("charset")) {
        html = html.replace("<head>", '<head>\n    <meta charset="UTF-8" />');
        patched = true;
        description = "Inserted charset meta tag.";
      } else {
        patched = true;
        description = "Charset meta tag already present in index.html — no change needed.";
      }
      break;
    }

    case "lang_missing": {
      if (!html.includes('lang="')) {
        html = html.replace("<html", '<html lang="en"');
        patched = true;
        description = 'Added lang="en" attribute to <html> tag.';
      } else {
        patched = true;
        description = 'HTML lang attribute already present in index.html — no change needed.';
      }
      break;
    }

    case "og_missing":
    case "og_incomplete": {
      // og_missing: no OG tags at all
      // og_incomplete: some but not all 4 required OG tags
      if (!html.includes('property="og:')) {
        const ogTags = `    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://nolandearthworks.com/" />
    <meta property="og:title" content="Noland Earthworks, LLC — Land Clearing &amp; Forestry Mulching in Tennessee" />
    <meta property="og:description" content="Veteran-owned land clearing and forestry mulching in Middle &amp; West Tennessee. Free estimates. Call 615-406-4819." />
    <meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />`;
        html = html.replace("</head>", `${ogTags}\n  </head>`);
        patched = true;
        description = "Inserted complete set of Open Graph meta tags.";
      } else {
        // OG tags present but incomplete — ensure all 4 required tags exist
        let changed = false;
        if (!html.includes('property="og:type"')) {
          html = html.replace('<!-- Open Graph', '<!-- Open Graph\n    <meta property="og:type" content="website" />');
          changed = true;
        }
        if (!html.includes('property="og:title"')) {
          html = html.replace('</head>', '    <meta property="og:title" content="Noland Earthworks, LLC — Land Clearing &amp; Forestry Mulching in Tennessee" />\n  </head>');
          changed = true;
        }
        if (!html.includes('property="og:description"')) {
          html = html.replace('</head>', '    <meta property="og:description" content="Veteran-owned land clearing and forestry mulching in Middle &amp; West Tennessee. Free estimates. Call 615-406-4819." />\n  </head>');
          changed = true;
        }
        if (!html.includes('property="og:image"')) {
          html = html.replace('</head>', '    <meta property="og:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp" />\n  </head>');
          changed = true;
        }
        if (changed) {
          patched = true;
          description = "Added missing Open Graph tags to complete the required set (og:type, og:title, og:description, og:image).";
        } else {
          patched = true;
          description = "All required Open Graph tags already present in index.html — no change needed.";
        }
      }
      break;
    }

    case "twitter_card_missing": {
      if (!html.includes('name="twitter:card"')) {
        const twitterTags = `    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Noland Earthworks, LLC — Land Clearing &amp; Forestry Mulching in Tennessee" />
    <meta name="twitter:description" content="Veteran-owned land clearing and forestry mulching in Middle &amp; West Tennessee. Free estimates." />
    <meta name="twitter:image" content="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp" />`;
        html = html.replace("</head>", `${twitterTags}\n  </head>`);
        patched = true;
        description = "Inserted Twitter Card meta tags.";
      } else {
        patched = true;
        description = "Twitter Card tags already present in index.html — no change needed.";
      }
      break;
    }
  }

  if (!patched) {
    return {
      patched: false,
      manual: false,
      reason: `No change needed — "${checkId}" is already correct in client/index.html.`,
    };
  }

  // Write the updated file
  try {
    fs.writeFileSync(INDEX_HTML_PATH, html, "utf8");
  } catch (err) {
    return {
      patched: false,
      manual: false,
      reason: `Patch generated but could not write client/index.html: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { patched: true, description };
}
