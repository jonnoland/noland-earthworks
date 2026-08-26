import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: { googlePlacesApiKey: "test-key" },
}));

import { resolveUniqueParcelForWebsiteRequest } from "./quoteRouter";

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
});
