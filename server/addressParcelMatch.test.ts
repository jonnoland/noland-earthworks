import { describe, expect, it } from "vitest";
import { isExactAddressParcelMatch, normalizeParcelCounty, normalizeParcelStreet } from "../shared/addressParcelMatch";

describe("Website Request address-to-parcel matching", () => {
  it("normalizes common Tennessee road suffixes before comparing a request to parcel data", () => {
    expect(normalizeParcelStreet("93 Halliburton Road")).toBe("93HALLIBURTONRD");
    expect(normalizeParcelStreet("93 Halliburton Rd.")).toBe("93HALLIBURTONRD");
    expect(normalizeParcelCounty("Houston County")).toBe("HOUSTON");
  });

  it("only accepts a parcel when both submitted street and selected county match", () => {
    expect(isExactAddressParcelMatch({
      submittedStreet: "93 Halliburton Road",
      submittedCounty: "Houston County",
      parcelStreet: "93 Halliburton Rd",
      parcelCounty: "Houston",
    })).toBe(true);

    expect(isExactAddressParcelMatch({
      submittedStreet: "93 Halliburton Road",
      submittedCounty: "Houston County",
      parcelStreet: "95 Halliburton Rd",
      parcelCounty: "Houston",
    })).toBe(false);

    expect(isExactAddressParcelMatch({
      submittedStreet: "93 Halliburton Road",
      submittedCounty: "Houston County",
      parcelStreet: "93 Halliburton Rd",
      parcelCounty: "Dickson",
    })).toBe(false);
  });
});
