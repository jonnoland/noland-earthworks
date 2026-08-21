import { describe, expect, it } from "vitest";
import { normalizeMarketingCopy } from "./routers/ads";

describe("Operations marketing copy policy", () => {
  it("removes retired terminology, adds the website lead CTA, and appends approved tags", () => {
    const copy = normalizeMarketingCopy("Need help with your acreage? #LandClearing", "facebook", "test-post");

    expect(copy).toContain("Request a Site Visit at nolandearthworks.com.");
    expect(copy).toContain("#LandManagement");
    expect(copy).not.toMatch(/#LandClearing/i);
    expect(copy.split("\n\n").length).toBeGreaterThanOrEqual(3);
  });

  it("keeps X copy inside the platform character limit after the CTA and tags are applied", () => {
    const copy = normalizeMarketingCopy("A".repeat(500), "x", "test-x");
    expect(copy.length).toBeLessThanOrEqual(280);
  });
});
