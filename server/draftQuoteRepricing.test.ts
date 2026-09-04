import { describe, expect, it } from "vitest";
import { repriceDraftQuoteLineItems } from "../shared/draftQuoteRepricing";

describe("repriceDraftQuoteLineItems", () => {
  it("updates acreage and full-day work, protects fixed costs, and preserves the effective discount percentage", () => {
    const result = repriceDraftQuoteLineItems([
      { description: "Forestry Mulching", qty: 2, unitPriceCents: 200_000, totalCents: 400_000, kind: "service" },
      { description: "Mobilization Fee", qty: 1, unitPriceCents: 45_000, totalCents: 45_000 },
      { description: "First-Time Customer Discount", qty: 1, unitPriceCents: -84_450, totalCents: -84_450, kind: "discount" },
      { description: "Measured trail work", qty: 500, unitPriceCents: 500, totalCents: 250_000, kind: "service", measurementUnit: "linear_foot" },
      { description: "Full Operating Day", qty: 1, unitPriceCents: 149_500, totalCents: 149_500, kind: "full_operating_day" },
    ], 285_000, 149_500);

    expect(result.repriceableItemCount).toBe(2);
    expect(result.skippedPositiveItemCount).toBe(2);
    expect(result.lineItems[0]).toMatchObject({ unitPriceCents: 381_300, totalCents: 762_600 });
    expect(result.lineItems[1]).toMatchObject({ unitPriceCents: 45_000, totalCents: 45_000 });
    expect(result.lineItems[2]).toMatchObject({ unitPriceCents: -134_200, totalCents: -134_200 });
    expect(result.lineItems[3]).toMatchObject({ unitPriceCents: 500, totalCents: 250_000 });
    expect(result.lineItems[4]).toMatchObject({ unitPriceCents: 285_000, totalCents: 285_000 });
  });
});
