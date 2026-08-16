import { describe, expect, it } from "vitest";
import { isKnownSpaRoute } from "./publicRoutePolicy";

describe("isKnownSpaRoute", () => {
  it("permits sitemap pages and valid dynamic page families", () => {
    expect(isKnownSpaRoute("/services/forestry-mulching")).toBe(true);
    expect(isKnownSpaRoute("/service-areas/dickson-county")).toBe(true);
    expect(isKnownSpaRoute("/blog/cost-of-land-management-tennessee")).toBe(true);
    expect(isKnownSpaRoute("/quote/customer-token")).toBe(true);
    expect(isKnownSpaRoute("/services/trail-cutting")).toBe(true);
    expect(isKnownSpaRoute("/ops/register")).toBe(true);
  });

  it("rejects unrelated unknown paths to avoid soft 404 responses", () => {
    expect(isKnownSpaRoute("/does-not-exist")).toBe(false);
    expect(isKnownSpaRoute("/random-path/with/no-route")).toBe(false);
  });
});
