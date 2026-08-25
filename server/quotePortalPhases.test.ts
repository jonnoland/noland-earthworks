import { describe, expect, it } from "vitest";
import { getQuotePortalPhaseSummary } from "../shared/quotePortalPhases";

describe("customer portal phased quote summary", () => {
  it("separates currently approved work from optional future phases", () => {
    const summary = getQuotePortalPhaseSummary([
      { description: "Phase 1 — Homesite", qty: 1, unitPriceCents: 1000000, kind: "phase", phaseAuthorization: "approved_now" },
      { description: "Phase 2 — Back acreage", qty: 1, unitPriceCents: 600000, kind: "phase", phaseAuthorization: "optional_future" },
      { description: "Veteran discount", qty: 1, unitPriceCents: -160000, kind: "discount" },
    ]);

    expect(summary.phaseOneTotalCents).toBe(900000);
    expect(summary.optionalFutureTotalCents).toBe(540000);
    expect(summary.approvedLineItems.map((item) => item.description)).toEqual(["Phase 1 — Homesite"]);
    expect(summary.optionalFutureLineItems.map((item) => item.description)).toEqual(["Phase 2 — Back acreage"]);
    expect(summary.approvedDiscountCents).toBe(-100000);
    expect(summary.optionalDiscountCents).toBe(-60000);
  });
});
