import { describe, expect, it } from "vitest";
import { buildQuoteCostBreakdown } from "../shared/quoteCostBreakdown";
import { ensureQuotePhaseIds, getQuotePhaseSections } from "../shared/quotePhaseSections";

describe("phase-scoped quote sections", () => {
  it("keeps mobilization and discounts inside their selected phase", () => {
    const items = ensureQuotePhaseIds([
      { description: "Phase 1", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "phase" as const, phaseAuthorization: "approved_now" as const },
      { description: "Mulching", qty: 1, unitPriceCents: 630000, totalCents: 630000, kind: "service" as const, phaseId: "phase-1" },
      { description: "Mobilization", qty: 1, unitPriceCents: 45000, totalCents: 45000, kind: "mobilization" as const, phaseId: "phase-1" },
      { description: "Phase 1 discount", qty: 1, unitPriceCents: -50000, totalCents: -50000, kind: "discount" as const, phaseId: "phase-1" },
      { description: "Phase 2", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "phase" as const, phaseAuthorization: "optional_future" as const },
      { description: "Slope work", qty: 1, unitPriceCents: 120000, totalCents: 120000, kind: "service" as const, phaseId: "phase-5" },
    ]);
    const sections = getQuotePhaseSections(items);
    const breakdown = buildQuoteCostBreakdown(items);

    expect(sections[0]).toMatchObject({ subtotalCents: 675000, discountCents: -50000, totalCents: 625000 });
    expect(sections[1]).toMatchObject({ subtotalCents: 120000, totalCents: 120000 });
    expect(breakdown.amountDueNowCents).toBe(625000);
    expect(breakdown.optionalFuturePhaseCents).toBe(120000);
  });
});
