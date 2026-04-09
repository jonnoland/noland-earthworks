import { useEffect } from "react";

const SITE_NAME = "Noland Earthworks, LLC";
const DEFAULT_DESCRIPTION =
  "Veteran-owned land clearing and forestry mulching services in Middle & West Tennessee. Free estimates. Licensed & insured. Call 615-406-4819.";
const BASE_URL = "https://nolandearthworks.com";

/**
 * Manages document title, meta description, and canonical link tag.
 * @param title      Page title (appended with site name automatically)
 * @param description  Optional meta description (falls back to site default)
 * @param canonicalPath  Optional path for canonical URL, e.g. "/service-areas/wilson-county"
 *                       If omitted, no canonical tag is set/updated.
 */
export function usePageTitle(title: string, description?: string, canonicalPath?: string) {
  useEffect(() => {
    // Title
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    // Meta description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || DEFAULT_DESCRIPTION;

    // Canonical link
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
      const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (el) el.content = DEFAULT_DESCRIPTION;
      // Remove canonical on unmount if we set it
      if (canonicalPath) {
        const c = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (c) c.remove();
      }
    };
  }, [title, description, canonicalPath]);
}
