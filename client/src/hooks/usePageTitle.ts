import { useEffect } from "react";

const SITE_NAME = "Noland Earthworks, LLC";
const DEFAULT_DESCRIPTION =
  "Veteran-owned land clearing and forestry mulching services in Middle & West Tennessee. Free estimates. Licensed & insured. Call 615-406-4819.";
const BASE_URL = "https://nolandearthworks.com";

/** Upsert a <meta> tag by property or name attribute */
function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/**
 * Manages document title, meta description, canonical link, and Open Graph tags.
 * @param title          Page title (site name appended automatically)
 * @param description    Optional meta description (falls back to site default)
 * @param canonicalPath  Optional path for canonical URL, e.g. "/service-areas/wilson-county"
 */
export function usePageTitle(title: string, description?: string, canonicalPath?: string) {
  useEffect(() => {
    // Strip any trailing "| Noland Earthworks" variant the caller may have included
    // to avoid duplication like "Page | Noland Earthworks | Noland Earthworks, LLC"
    const cleanTitle = title
      ? title
          .replace(/\s*\|\s*Noland Earthworks,?\s*(LLC)?\s*$/i, "")
          .replace(/\s*\|\s*Noland Earthworks\s*$/i, "")
          .trim()
      : "";
    const fullTitle = cleanTitle ? `${cleanTitle} | ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESCRIPTION;

    // ── <title> ──────────────────────────────────────────────────────────────
    document.title = fullTitle;

    // ── <meta name="description"> ────────────────────────────────────────────
    setMeta("name", "description", desc);

    // ── Open Graph ───────────────────────────────────────────────────────────
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    if (canonicalPath) {
      setMeta("property", "og:url", `${BASE_URL}${canonicalPath}`);
    }

    // ── Twitter Card ─────────────────────────────────────────────────────────
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);

    // ── Canonical link ───────────────────────────────────────────────────────
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalPath) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `${BASE_URL}${canonicalPath}`;
    }

    return () => {
      document.title = SITE_NAME;
      setMeta("name", "description", DEFAULT_DESCRIPTION);
      setMeta("property", "og:title", SITE_NAME);
      setMeta("property", "og:description", DEFAULT_DESCRIPTION);
      setMeta("name", "twitter:title", SITE_NAME);
      setMeta("name", "twitter:description", DEFAULT_DESCRIPTION);
      // Remove canonical on unmount if we set it
      if (canonicalPath) {
        const c = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (c) c.remove();
      }
    };
  }, [title, description, canonicalPath]); // eslint-disable-line react-hooks/exhaustive-deps
}
