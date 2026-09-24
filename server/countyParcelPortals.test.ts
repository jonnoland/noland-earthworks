import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COUNTY_PARCEL_PORTALS,
  getCountyParcelPortal,
  isStatewideParcelCoverageException,
} from "../shared/countyParcelPortals";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("county-maintained parcel portals", () => {
  it("lists every county excluded from the 86-county Tennessee Property Viewer service", () => {
    expect(COUNTY_PARCEL_PORTALS.map((portal) => portal.county)).toEqual([
      "Chester County",
      "Davidson County",
      "Hamilton County",
      "Hickman County",
      "Knox County",
      "Montgomery County",
      "Rutherford County",
      "Shelby County",
      "Williamson County",
    ]);
    expect(COUNTY_PARCEL_PORTALS.every((portal) => portal.portalUrl.startsWith("https://"))).toBe(true);
  });

  it("normalizes county selections and preserves the existing Operations Davidson integration", () => {
    expect(getCountyParcelPortal("Montgomery")).toMatchObject({
      county: "Montgomery County",
      portalUrl: "https://property.spatialest.com/tn/montgomery#/",
      operationsLookupSupported: false,
      fieldLookupSupported: false,
    });
    expect(getCountyParcelPortal("Davidson County")).toMatchObject({
      operationsLookupSupported: true,
      fieldLookupSupported: false,
    });
    expect(isStatewideParcelCoverageException("Hickman")).toBe(true);
    expect(isStatewideParcelCoverageException("Cheatham")).toBe(false);
  });

  it("shows the official county portal in both quote workflows and bypasses unsupported automated lookups", () => {
    const operationsQuote = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const fieldQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(operationsQuote).toContain("getCountyParcelPortal");
    expect(operationsQuote).toContain("Official {selectedCountyPortal.county} property records");
    expect(operationsQuote).toContain("!selectedCountyPortal.operationsLookupSupported");
    expect(operationsQuote).toContain("Open county portal");

    expect(fieldQuote).toContain("getCountyParcelPortal");
    expect(fieldQuote).toContain("Official {selectedCountyPortal.county} property records");
    expect(fieldQuote).toContain("!selectedCountyPortal.fieldLookupSupported");
    expect(fieldQuote).toContain("Open {selectedCountyPortal.shortLabel}");
  });
});
