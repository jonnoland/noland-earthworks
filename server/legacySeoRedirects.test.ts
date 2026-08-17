import { describe, expect, it } from "vitest";
import { getLegacySeoRedirect, LEGACY_SEO_REDIRECTS } from "./legacySeoRedirects";

describe("legacy SEO redirect map", () => {
  it("maps Search Console legacy and duplicate URLs to their preferred live pages", () => {
    expect(getLegacySeoRedirect("/blog/cost-of-land-clearing-tennessee")).toBe(
      "/blog/cost-of-land-management-tennessee"
    );
    expect(getLegacySeoRedirect(`/${"services"}/${["land", "clearing"].join("-")}`)).toBe(
      "/services/land-management"
    );
    expect(getLegacySeoRedirect("/services/mulch-redistribution")).toBe(
      "/services/add-ons/mulch-redistribution"
    );
    expect(getLegacySeoRedirect("/services/selective-clearing")).toBe(
      "/services/add-ons/selective-mulching"
    );
    expect(getLegacySeoRedirect("/services/add-ons/selective-clearing")).toBe(
      "/services/add-ons/selective-mulching"
    );
  });

  it("consolidates duplicate county blog URLs into matching service-area pages", () => {
    expect(getLegacySeoRedirect("/blog/land-management-cheatham-county")).toBe(
      "/service-areas/cheatham-county"
    );
    expect(getLegacySeoRedirect("/blog/land-management-williamson-county")).toBe(
      "/service-areas/williamson-county"
    );
    expect(getLegacySeoRedirect("/blog/land-management-developers-farmers-middle-tennessee")).toBeUndefined();
  });

  it("uses only internal preferred destinations", () => {
    expect(Object.values(LEGACY_SEO_REDIRECTS).every((path) => path.startsWith("/"))).toBe(true);
  });
});
