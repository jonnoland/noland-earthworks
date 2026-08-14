import { describe, expect, it } from "vitest";
import { buildItemizedQuoteLines, parsePreliminaryRangeToCents, totalItemizedCents, type ServiceEstimateBreakdown } from "@shared/quoteServiceItemization";

describe("quote service itemization", () => {
  const forestry: ServiceEstimateBreakdown = {
    service: "forestry-mulching",
    label: "Forestry Mulching",
    lowCents: 650000,
    highCents: 1200000,
    measurement: "1.00 acre",
    calculation: "1 acre × preliminary rate",
  };
  const trail: ServiceEstimateBreakdown = {
    service: "trail-cutting",
    label: "Trail Cutting",
    lowCents: 528000,
    highCents: 1056000,
    measurement: "2,640 linear feet",
    calculation: "2,640 linear feet × preliminary rate",
  };

  it("parses a displayed preliminary range into integer cents", () => {
    expect(parsePreliminaryRangeToCents("$5,280 – $10,560")).toEqual({ lowCents: 528000, highCents: 1056000 });
  });

  it("creates one editable line item for every selected service", () => {
    const lines = buildItemizedQuoteLines([forestry, trail]);
    expect(lines).toHaveLength(2);
    expect(lines[0].description).toContain("Forestry Mulching");
    expect(lines[1].description).toContain("Trail Cutting");
    expect(lines[1].totalCents).toBe(792000);
  });

  it("totals itemized midpoints without collapsing services", () => {
    expect(totalItemizedCents([forestry, trail])).toBe(1717000);
  });
});
