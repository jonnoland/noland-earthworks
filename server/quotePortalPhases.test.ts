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

  it("keeps phase-assigned mobilization and discounts with the correct portal phase", () => {
    const summary = getQuotePortalPhaseSummary([
      { description: "Phase 1", qty: 1, unitPriceCents: 630000, kind: "phase", phaseId: "phase-1", phaseAuthorization: "approved_now" },
      { description: "Phase 1 mobilization", qty: 1, unitPriceCents: 45000, kind: "mobilization", phaseId: "phase-1" },
      { description: "Phase 2", qty: 1, unitPriceCents: 1935000, kind: "phase", phaseId: "phase-2", phaseAuthorization: "optional_future" },
      { description: "Phase 2 mobilization", qty: 1, unitPriceCents: 45000, kind: "mobilization", phaseId: "phase-2" },
      { description: "Phase 2 volume discount", qty: 1, unitPriceCents: -59400, kind: "discount", phaseId: "phase-2" },
    ]);

    expect(summary.approvedPhaseSections).toHaveLength(1);
    expect(summary.approvedPhaseSections[0].lineItems.map((item) => item.description)).toEqual(["Phase 1", "Phase 1 mobilization"]);
    expect(summary.optionalFuturePhaseSections).toHaveLength(1);
    expect(summary.optionalFuturePhaseSections[0].lineItems.map((item) => item.description)).toEqual(["Phase 2", "Phase 2 mobilization", "Phase 2 volume discount"]);
    expect(summary.phaseOneTotalCents).toBe(675000);
    expect(summary.optionalFutureTotalCents).toBe(1920600);
  });
});
