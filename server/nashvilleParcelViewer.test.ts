import { describe, expect, it } from "vitest";
import {
  buildExactNashvilleParcelWhere,
  getNashvilleParcelViewerUrl,
  isDavidsonCounty,
  mapNashvilleParcelFeature,
} from "./nashvilleParcelViewer";

describe("Nashville Parcel Viewer adapter", () => {
  it("uses the official Davidson County source only for Davidson County names", () => {
    expect(isDavidsonCounty("Davidson")).toBe(true);
    expect(isDavidsonCounty("Davidson County")).toBe(true);
    expect(isDavidsonCounty("Houston County")).toBe(false);
  });

  it("builds a normalized APN query and official viewer link", () => {
    expect(buildExactNashvilleParcelWhere("003-000-00500")).toBe("APN = '00300000500'");
    expect(getNashvilleParcelViewerUrl("00300000500")).toBe("https://maps.nashville.gov/ParcelViewer/?parcelID=00300000500");
  });

  it("maps Nashville parcel data to the shared quote lookup contract", () => {
    expect(mapNashvilleParcelFeature({
      attributes: {
        APN: "00300000500",
        PropAddr: "0 TINNIN RD",
        PropCity: "GOODLETTSVILLE",
        PropZip: "37072",
        Owner: "JONES, ARSDELL ETUX",
        Acres: 3.3,
      },
      centroid: { x: -86.73, y: 36.35 },
    })).toMatchObject({
      parcelId: "00300000500",
      county: "Davidson County",
      street: "0 TINNIN RD",
      city: "GOODLETTSVILLE",
      zip: "37072",
      address: "0 TINNIN RD, GOODLETTSVILLE TN 37072",
      deedAcreage: 3.3,
      propertyViewerUrl: "https://maps.nashville.gov/ParcelViewer/?parcelID=00300000500",
    });
  });
});
