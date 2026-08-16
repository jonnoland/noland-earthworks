import { describe, expect, it } from "vitest";
import { LEGACY_SEO_REDIRECTS } from "./legacySeoRedirects";
import { STATIC_SITEMAP_PAGES } from "./sitemapRoutes";

describe("static sitemap routes", () => {
  it("contains unique canonical public paths and excludes legacy redirect sources", () => {
    const paths = STATIC_SITEMAP_PAGES.map((page) => page.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith("/") && !path.startsWith("/api/"))).toBe(true);

    for (const redirectSource of Object.keys(LEGACY_SEO_REDIRECTS)) {
      expect(paths).not.toContain(redirectSource);
    }
  });
});
