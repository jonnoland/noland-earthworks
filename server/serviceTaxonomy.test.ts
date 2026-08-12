import { describe, expect, it } from "vitest";
import { getServiceDisplayName } from "./serviceTaxonomy";

describe("getServiceDisplayName", () => {
  it("normalizes legacy and slug-based public service values", () => {
    expect(getServiceDisplayName("land-clearing")).toBe("Land Management");
    expect(getServiceDisplayName("Forestry Mulching / Land Management")).toBe("Land Management");
    expect(getServiceDisplayName("property-maintenance")).toBe("Brush Hogging");
  });

  it("keeps an unrecognized service visible for manual review", () => {
    expect(getServiceDisplayName("Custom fence repair")).toBe("Custom fence repair");
    expect(getServiceDisplayName(" ")).toBe("Service to be confirmed");
  });
});
