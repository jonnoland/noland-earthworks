import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCountyGisParcelSource,
  isAutomaticCountyGisParcelLookup,
  lookupCountyGisParcels,
} from "./countyGisParcelLookup";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("county GIS parcel lookups", () => {
  it("limits automatic lookup to the three verified county GIS services", () => {
    expect(getCountyGisParcelSource("Davidson")).toMatchObject({
      county: "Davidson County",
      source: "Metro Nashville Parcel GIS",
    });
    expect(getCountyGisParcelSource("Montgomery County")).toMatchObject({
      county: "Montgomery County",
      source: "Montgomery County Public Parcels GIS",
    });
    expect(getCountyGisParcelSource("Rutherford")).toMatchObject({
      county: "Rutherford County",
      source: "Rutherford County Parcel GIS",
    });
    expect(isAutomaticCountyGisParcelLookup("Knox County")).toBe(false);
  });

  it("maps Davidson address candidates and never treats the returned boundary as a legal survey", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      features: [{
        attributes: {
          STANPAR: "03900007700",
          ParID: 20200,
          PropAddr: "5070 CLARKSVILLE PIKE",
          PropCity: "NASHVILLE",
          PropZip: "37218",
          Owner: "EXAMPLE OWNER",
          Acres: 4.2,
        },
        centroid: { x: -86.9, y: 36.2 },
      }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const matches = await lookupCountyGisParcels({
      county: "Davidson County",
      address: "5070 Clarksville Pike, Nashville, TN",
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      parcelId: "03900007700",
      county: "Davidson County",
      address: "5070 CLARKSVILLE PIKE, NASHVILLE TN 37218",
      owner: "EXAMPLE OWNER",
      deedAcreage: 4.2,
      centroid: { lat: 36.2, lng: -86.9 },
      source: "Metro Nashville Parcel GIS",
    });
    expect(matches[0]?.referenceNotice).toContain("not a legal survey");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("PropAddr+LIKE");
  });

  it("uses the appropriate assessor identifier for Montgomery and Rutherford candidates", async () => {
    const responses = [
      {
        features: [{
          attributes: {
            ParcelNo: "005E A 00100 000",
            GISLINK: "063005E A 00100",
            PropertyAddress: "150 STATE LINE RD",
            PropertyCity: "CLARKSVILLE",
            CalcAcreage: 0.28,
          },
          geometry: {
            rings: [[[-87.45, 36.6], [-87.4, 36.6], [-87.4, 36.65], [-87.45, 36.6]]],
          },
        }],
      },
      {
        features: [{
          attributes: {
            ParcelID: "076-030.06-000",
            FormattedLocation: "7592 ALMAVILLE RD",
            LocationCity: "ARRINGTON",
            LocationZip: "37014",
            Owner1: "EXAMPLE OWNER",
            DEEDACRES: 5.05,
          },
          centroid: { x: -86.6, y: 35.9 },
        }],
      },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(responses[0]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(responses[1]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const montgomery = await lookupCountyGisParcels({ county: "Montgomery", parcelId: "005E A 00100 000" });
    const rutherford = await lookupCountyGisParcels({ county: "Rutherford", parcelId: "076-030.06-000" });

    expect(montgomery[0]).toMatchObject({
      parcelId: "005E A 00100 000",
      county: "Montgomery County",
      deedAcreage: 0.28,
    });
    expect(montgomery[0]?.centroid?.lat).toBeCloseTo(36.625, 6);
    expect(montgomery[0]?.centroid?.lng).toBeCloseTo(-87.425, 6);
    expect(rutherford[0]).toMatchObject({
      parcelId: "076-030.06-000",
      county: "Rutherford County",
      owner: "EXAMPLE OWNER",
      deedAcreage: 5.05,
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("PublicParcels");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("Parcel_Data");
  });
});
