import { describe, expect, it } from "vitest";
import { isServedCounty, normalizeCountyName, SERVICE_AREA_COUNTIES } from "@shared/serviceAreas";

describe("approved Site Visit Request service area", () => {
  it("contains the published service-area counties and normalizes common county input", () => {
    expect(SERVICE_AREA_COUNTIES).toContain("Dickson County");
    expect(SERVICE_AREA_COUNTIES).toContain("Houston County");
    expect(SERVICE_AREA_COUNTIES).toContain("Madison County");
    expect(normalizeCountyName("Dickson")).toBe("Dickson County");
  });

  it("accepts approved counties and rejects counties outside the current service area", () => {
    for (const county of SERVICE_AREA_COUNTIES) {
      const shortCounty = county.replace(" County", "");
      expect(isServedCounty(county)).toBe(true);
      expect(isServedCounty(shortCounty)).toBe(true);
      expect(normalizeCountyName(shortCounty)).toBe(county);
    }
    expect(isServedCounty("Knox County")).toBe(false);
  });
});
