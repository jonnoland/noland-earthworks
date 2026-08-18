import { describe, expect, it } from "vitest";
import { buildTennesseeParcelWhere, normalizeTennesseeParcelId } from "./parcelRouter";
import { validateTennesseeParcelId } from "../shared/tennesseeParcelId";

describe("Tennessee Parcel ID lookup", () => {
  it("normalizes formatted Parcel IDs for a tolerant official-service search", () => {
    expect(normalizeTennesseeParcelId("042 001 00100-000 2026")).toBe("042001001000002026");
  });

  it("scopes Parcel ID lookup to the selected county", () => {
    const where = buildTennesseeParcelWhere("Houston County", "042 001 00100");

    expect(where).toContain("COUNTY_NAME = 'Houston'");
    expect(where).toContain("PARCELID LIKE '%0%4%2%0%0%1%0%0%1%0%0%'");
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

});
