import { describe, expect, it } from "vitest";
import { buildExactTennesseeParcelWhere, buildTennesseeParcelWhere, normalizeTennesseeParcelId, toParcelBoundaryRings } from "./parcelRouter";
import { buildTennesseeParcelSearchPattern, validateTennesseeParcelId } from "../shared/tennesseeParcelId";

describe("Tennessee Parcel ID lookup", () => {
  it("normalizes formatted Parcel IDs for a tolerant official-service search", () => {
    expect(normalizeTennesseeParcelId("042 001 00100-000 2026")).toBe("042001001000002026");
  });

  it("scopes an anchored tolerant Parcel ID lookup to the selected county", () => {
    const where = buildTennesseeParcelWhere("Houston County", "042 001 00100");

    expect(where).toContain("COUNTY_NAME = 'Houston'");
    expect(where).toContain("PARCELID LIKE '042%001%00100%'");
    expect(where).not.toContain("PARCELID LIKE '%042");
  });

  it("keeps unformatted Parcel IDs anchored while tolerating assessor spacing", () => {
    expect(buildTennesseeParcelSearchPattern("04200100100")).toBe("0%4%2%0%0%1%0%0%1%0%0%");
  });

  it("prefers an exact county-scoped formatted Parcel ID query before using the tolerant fallback", () => {
    expect(buildExactTennesseeParcelWhere("Dickson County", "022 001    00100 000 2026")).toBe(
      "COUNTY_NAME = 'Dickson' AND PARCELID = '022 001    00100 000 2026'"
    );
  });

  it("accepts Tennessee county-style map/group/parcel components", () => {
    expect(validateTennesseeParcelId("042 001 00100 000 2026")).toEqual({
      valid: true,
      normalized: "042001001000002026",
    });
    expect(validateTennesseeParcelId("024.M.B.01300.000")).toEqual({
      valid: true,
      normalized: "024MB01300000",
    });
  });

  it("rejects incomplete or unsafe Parcel ID input before it reaches the Tennessee service", () => {
    expect(validateTennesseeParcelId("12").valid).toBe(false);
    expect(validateTennesseeParcelId("042; DROP TABLE").valid).toBe(false);
  });

  it("converts ArcGIS parcel rings into map-ready latitude and longitude paths", () => {
    expect(toParcelBoundaryRings({
      rings: [[[-87.5, 36.2], [-87.4, 36.2], [-87.4, 36.3], [-87.5, 36.2]]],
    })).toEqual([[{ lat: 36.2, lng: -87.5 }, { lat: 36.2, lng: -87.4 }, { lat: 36.3, lng: -87.4 }, { lat: 36.2, lng: -87.5 }]]);
    expect(toParcelBoundaryRings({ rings: [[[-87.5, 36.2]]] })).toBeNull();
  });

});
