import { describe, expect, it } from "vitest";
import { buildTennesseeParcelWhere, normalizeTennesseeParcelId } from "./parcelRouter";

describe("Tennessee Parcel ID lookup", () => {
  it("normalizes formatted Parcel IDs for a tolerant official-service search", () => {
    expect(normalizeTennesseeParcelId("042 001 00100-000 2026")).toBe("042001001000002026");
  });

  it("scopes Parcel ID lookup to the selected county", () => {
    const where = buildTennesseeParcelWhere("Houston County", "042 001 00100");

    expect(where).toContain("COUNTY_NAME = 'Houston'");
    expect(where).toContain("PARCELID LIKE '%0%4%2%0%0%1%0%0%1%0%0%'");
  });
});
