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

  it("normalizes county selections and enables only verified automatic county GIS lookups", () => {
    expect(getCountyParcelPortal("Montgomery")).toMatchObject({
      county: "Montgomery County",
      portalUrl: "https://property.spatialest.com/tn/montgomery#/",
      operationsLookupSupported: true,
      fieldLookupSupported: true,
    });
    expect(getCountyParcelPortal("Davidson County")).toMatchObject({
      operationsLookupSupported: true,
      fieldLookupSupported: true,
    });
    expect(getCountyParcelPortal("Rutherford")).toMatchObject({
      operationsLookupSupported: true,
      fieldLookupSupported: true,
    });
    expect(getCountyParcelPortal("Knox")).toMatchObject({
      operationsLookupSupported: false,
      fieldLookupSupported: false,
    });
    expect(isStatewideParcelCoverageException("Hickman")).toBe(true);
    expect(isStatewideParcelCoverageException("Cheatham")).toBe(false);
  });

  it("shows automatic candidate controls only for verified counties and manual portal guidance everywhere else", () => {
    const operationsQuote = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const fieldQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const parcelRouter = source("server/parcelRouter.ts");
    const fieldRouter = source("server/fieldQuoteRouter.ts");

    expect(operationsQuote).toContain("getCountyParcelPortal");
    expect(operationsQuote).toContain("Official {selectedCountyPortal.county} property records");
    expect(operationsQuote).toContain("!selectedCountyPortal.operationsLookupSupported");
    expect(operationsQuote).toContain("Open county portal");
    expect(operationsQuote).toContain("Find from address");
    expect(operationsQuote).toContain("parcel.lookupCandidates");
    expect(operationsQuote).toContain("copyManualPortalAddress");
    expect(operationsQuote).toContain("Copy address");
    expect(operationsQuote).toContain("navigator.clipboard.writeText");

    expect(fieldQuote).toContain("getCountyParcelPortal");
    expect(fieldQuote).toContain("Official {selectedCountyPortal.county} property records");
    expect(fieldQuote).toContain("!selectedCountyPortal.fieldLookupSupported");
    expect(fieldQuote).toContain("Open {selectedCountyPortal.shortLabel}");
    expect(fieldQuote).toContain("Find from address / GPS");
    expect(fieldQuote).toContain("fieldQuote.lookupParcelCandidates");
    expect(fieldQuote).toContain("copyManualPortalAddress");
    expect(fieldQuote).toContain("Copy address");
    expect(fieldQuote).toContain("navigator.clipboard.writeText");

    expect(parcelRouter).toContain("lookupCandidates: protectedProcedure");
    expect(parcelRouter).toContain("lookupCountyGisParcels");
    expect(fieldRouter).toContain("lookupParcelCandidates: requireAppToken");
    expect(fieldRouter).toContain("lookupCountyGisParcels");
  });
});
