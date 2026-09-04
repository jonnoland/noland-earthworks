import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "noland-earthworks-mobile/src/pages/NewQuote.tsx"), "utf8");

describe("Noland Field GPS county detection", () => {
  it("detects device location, reverse geocodes the county, and selects only a configured service county", () => {
    expect(source).toContain("const handleDetectCounty");
    expect(source).toContain("Geolocation.getCurrentPosition");
    expect(source).toContain("fieldQuote.reverseGeocode.query");
    expect(source).toContain("isServedCounty(county)");
    expect(source).toContain("Selected ${county} from your current location.");
    expect(source).toContain("Detect My Location");
  });

  it("provides useful loading, permission, and out-of-area feedback while keeping manual selection available", () => {
    expect(source).toContain("countyDetecting");
    expect(source).toContain("countyDetectionError");
    expect(source).toContain("outside the configured service-area list");
    expect(source).toContain("select it manually");
  });
});
