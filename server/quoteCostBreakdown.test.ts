import { describe, expect, it } from "vitest";
import { buildQuoteCostBreakdown } from "../shared/quoteCostBreakdown";

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
});
