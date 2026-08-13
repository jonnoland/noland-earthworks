import { describe, expect, it } from "vitest";
import { parseGooglePlaceAddress } from "./googlePlaceAddress";

describe("parseGooglePlaceAddress", () => {
  it("maps Google address components into editable quote fields", () => {
    expect(parseGooglePlaceAddress([
      { long_name: "123", short_name: "123", types: ["street_number"] },
      { long_name: "Farm Road", short_name: "Farm Rd", types: ["route"] },
      { long_name: "Nashville", short_name: "Nashville", types: ["locality", "political"] },
      { long_name: "Davidson County", short_name: "Davidson County", types: ["administrative_area_level_2", "political"] },
      { long_name: "Tennessee", short_name: "TN", types: ["administrative_area_level_1", "political"] },
      { long_name: "37201", short_name: "37201", types: ["postal_code"] },
      { long_name: "1234", short_name: "1234", types: ["postal_code_suffix"] },
    ])).toEqual({
      street: "123 Farm Road",
      city: "Nashville",
      state: "TN",
      zip: "37201-1234",
      county: "Davidson",
    });
  });
});
