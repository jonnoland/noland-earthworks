import { describe, expect, it } from "vitest";
import { estimateInternalSiteVisitCost } from "../shared/siteVisitCostEstimate";

describe("internal Parcel ID site-visit cost estimate", () => {
  it("uses retrieved acreage only as a transparent internal labor-planning proxy", () => {
    expect(estimateInternalSiteVisitCost(4)).toMatchObject({
      acreage: 4,
      plannedHours: 0.75,
      internalLaborCost: 26,
    });
    expect(estimateInternalSiteVisitCost(32)).toMatchObject({
      acreage: 32,
      plannedHours: 1.25,
      internalLaborCost: 44,
    });
  });

  it("does not produce a cost without a usable parcel-acreage value", () => {
    expect(estimateInternalSiteVisitCost(0)).toBeNull();
    expect(estimateInternalSiteVisitCost(Number.NaN)).toBeNull();
  });

  it("keeps the estimate explicitly limited to internal planning", () => {
    const estimate = estimateInternalSiteVisitCost(60);
    expect(estimate?.warning).toContain("Internal planning only");
    expect(estimate?.warning).toContain("Travel");
  });
});
