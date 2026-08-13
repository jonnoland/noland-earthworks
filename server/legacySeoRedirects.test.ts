import { describe, expect, it } from "vitest";
import { getLegacySeoRedirect, LEGACY_SEO_REDIRECTS } from "./legacySeoRedirects";

describe("legacy SEO redirect map", () => {
  it("maps Search Console legacy and duplicate URLs to their preferred live pages", () => {
    expect(getLegacySeoRedirect("/blog/cost-of-land-clearing-tennessee")).toBe(
      "/blog/cost-of-land-management-tennessee"
    );
    expect(getLegacySeoRedirect("/services/mulch-redistribution")).toBe(
      "/services/add-ons/mulch-redistribution"
    );
    expect(getLegacySeoRedirect("/services/selective-clearing")).toBe(
      "/services/add-ons/selective-clearing"
    );
  });

  it("uses only internal preferred destinations", () => {
    expect(Object.values(LEGACY_SEO_REDIRECTS).every((path) => path.startsWith("/"))).toBe(true);
  });
});
