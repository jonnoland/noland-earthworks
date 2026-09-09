import { describe, expect, it } from "vitest";
import { formatAcreageServiceDescription } from "../shared/quoteLineItemMeasurements";

describe("manual acreage quote adjustments", () => {
  it("keeps additional scope distinct from the primary acreage service row", () => {
    expect(formatAcreageServiceDescription({
      description: "Additional Forestry Mulching work — 1.25 acres",
      serviceCode: "forestry-mulching",
      qty: 1.25,
      unitPriceCents: 875,
    })).toBe("Additional Forestry Mulching - 1.25 acres @ $8.75/acre");
  });

  it("does not rewrite the standard primary acreage service label", () => {
    expect(formatAcreageServiceDescription({
      description: "Forestry Mulching",
      serviceCode: "forestry-mulching",
      qty: 3,
      unitPriceCents: 1200,
    })).toBe("Forestry Mulching - 3 acres @ $12.00/acre");
  });
});
