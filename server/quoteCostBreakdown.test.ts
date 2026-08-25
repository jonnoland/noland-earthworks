import { describe, expect, it } from "vitest";
import { buildQuoteCostBreakdown, getQuoteCostDistribution } from "../shared/quoteCostBreakdown";
import { DRAFT_CLIENT_PLACEHOLDER, DRAFT_TITLE_PLACEHOLDER, getQuoteDraftIdentity } from "../shared/quoteDrafts";

describe("live phased-work quote cost breakdown", () => {
  it("separates approved work from optional future phases and allocates discounts proportionately", () => {
    const breakdown = buildQuoteCostBreakdown([
      { kind: "phase", phaseAuthorization: "approved_now", qty: 1, unitPriceCents: 400_000 },
      { kind: "phase", phaseAuthorization: "optional_future", qty: 1, unitPriceCents: 200_000 },
      { kind: "full_operating_day", qty: 1, unitPriceCents: 150_000 },
      { kind: "half_operating_day", qty: 1, unitPriceCents: 75_000 },
      { kind: "discount", qty: 1, unitPriceCents: -82_500 },
    ]);

    expect(breakdown.approvedPhaseCents).toBe(400_000);
    expect(breakdown.optionalFuturePhaseCents).toBe(200_000);
    expect(breakdown.fullOperatingDayCents).toBe(150_000);
    expect(breakdown.halfOperatingDayCents).toBe(75_000);
    expect(breakdown.amountDueNowCents).toBe(562_500);
    expect(breakdown.allPhasesTotalCents).toBe(742_500);
    expect(breakdown.approvedDiscountCents + breakdown.optionalDiscountCents).toBe(-82_500);
  });

  it("treats legacy untyped positive rows as standard service work", () => {
    const breakdown = buildQuoteCostBreakdown([{ qty: 2, unitPriceCents: 50_000 }]);
    expect(breakdown.standardServiceCents).toBe(100_000);
    expect(breakdown.amountDueNowCents).toBe(100_000);
  });

  it("creates a chart-ready split between approved work and optional future phases", () => {
    const breakdown = buildQuoteCostBreakdown([
      { kind: "phase", phaseAuthorization: "approved_now", qty: 1, unitPriceCents: 100_000 },
      { kind: "phase", phaseAuthorization: "optional_future", qty: 1, unitPriceCents: 50_000 },
    ]);
    expect(getQuoteCostDistribution(breakdown)).toEqual([
      { name: "Approved work", value: 100_000, color: "#f59e0b" },
      { name: "Optional future phases", value: 50_000, color: "#818cf8" },
    ]);
  });

  it("uses clear placeholders so an incomplete quote can be saved as a draft", () => {
    expect(getQuoteDraftIdentity("", "")).toEqual({ clientName: DRAFT_CLIENT_PLACEHOLDER, title: DRAFT_TITLE_PLACEHOLDER });
  });
});
