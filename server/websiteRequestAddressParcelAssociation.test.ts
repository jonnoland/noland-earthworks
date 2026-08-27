import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: { googlePlacesApiKey: "test-key" },
}));

import { resolveUniqueParcelForWebsiteRequest } from "./quoteRouter";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Website Request address-to-parcel association", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const requestAddress = {
    street: "93 Halliburton Road",
    city: "Vanleer",
    state: "TN",
    zip: "37181",
    county: "Houston County",
  };

  const davidsonRequestAddress = {
    street: "0 Tinnin Road",
    city: "Goodlettsville",
    state: "TN",
    zip: "37072",
    county: "Davidson County",
  };

  it("returns the one exact county-and-street parcel match", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "OK",
        results: [{ geometry: { location: { lat: 36.221, lng: -87.466 } } }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [{ attributes: {
          PARCELID: "018 046.00",
          ADDRESS: "93 HALLIBURTON RD",
          COUNTY_NAME: "Houston",
          DEEDAC: 12.5,
        } }],
      })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveUniqueParcelForWebsiteRequest(requestAddress)).resolves.toEqual({
      parcelId: "018 046.00",
      county: "Houston",
      deedAcres: 12.5,
      lat: 36.221,
      lng: -87.466,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns no association when more than one exact parcel feature is returned", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "OK",
        results: [{ geometry: { location: { lat: 36.221, lng: -87.466 } } }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [
          { attributes: { PARCELID: "018 046.00", ADDRESS: "93 HALLIBURTON RD", COUNTY_NAME: "Houston", DEEDAC: 12.5 } },
          { attributes: { PARCELID: "018 046.01", ADDRESS: "93 HALLIBURTON RD", COUNTY_NAME: "Houston", DEEDAC: 1 } },
        ],
      })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveUniqueParcelForWebsiteRequest(requestAddress)).resolves.toBeNull();
  });

  it("uses Nashville Parcel Viewer for one exact Davidson County address match", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "OK",
        results: [{ geometry: { location: { lat: 36.35, lng: -86.73 } } }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [{ attributes: {
          APN: "00300000500",
          PropAddr: "0 TINNIN RD",
          PropCity: "GOODLETTSVILLE",
          PropZip: "37072",
          Acres: 3.3,
        } }],
      })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveUniqueParcelForWebsiteRequest(davidsonRequestAddress)).resolves.toEqual({
      parcelId: "00300000500",
      county: "Davidson County",
      deedAcres: 3.3,
      lat: 36.35,
      lng: -86.73,
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain("maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0/query");
  });

  it("does not auto-associate ambiguous Nashville Parcel Viewer matches", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "OK",
        results: [{ geometry: { location: { lat: 36.35, lng: -86.73 } } }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        features: [
          { attributes: { APN: "00300000500", PropAddr: "0 TINNIN RD", Acres: 3.3 } },
          { attributes: { APN: "00300000501", PropAddr: "0 TINNIN RD", Acres: 1.2 } },
        ],
      })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveUniqueParcelForWebsiteRequest(davidsonRequestAddress)).resolves.toBeNull();
  });

  it("keeps Nashville property acreage available for the editable quote calculation field", () => {
    const source = readFileSync(resolve(projectRoot, "client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(source).toContain("Parcel details and reported acreage copied into the editable quote fields.");
    expect(source).toContain("reported acreage:");
    expect(source).toContain("acreage: current.acreage || reportedAcreage || current.acreage");
  });
});
