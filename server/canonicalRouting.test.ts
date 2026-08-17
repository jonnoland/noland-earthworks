import { describe, expect, it } from "vitest";
import { getTrailingSlashCanonicalRedirect } from "./canonicalRouting";

describe("public canonical routing", () => {
  it("redirects public trailing-slash page paths to one canonical URL", () => {
    expect(getTrailingSlashCanonicalRedirect("/service-areas/henderson-county/", "GET"))
      .toBe("/service-areas/henderson-county");
    expect(getTrailingSlashCanonicalRedirect("/services/forestry-mulching/", "HEAD"))
      .toBe("/services/forestry-mulching");
  });

  it("leaves canonical public paths, non-page routes, and non-safe methods untouched", () => {
    expect(getTrailingSlashCanonicalRedirect("/service-areas/henderson-county", "GET")).toBeNull();
    expect(getTrailingSlashCanonicalRedirect("/", "GET")).toBeNull();
    expect(getTrailingSlashCanonicalRedirect("/api/trpc/", "GET")).toBeNull();
    expect(getTrailingSlashCanonicalRedirect("/assets/", "GET")).toBeNull();
    expect(getTrailingSlashCanonicalRedirect("/service-areas/henderson-county/", "POST")).toBeNull();
  });
});
