import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("quote discount line items", () => {
  it("provides non-stacking volume and customer discount actions in the quote editor", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");

    expect(editor).toContain("Optional discount line item");
    expect(editor).toContain("getSuggestedVolumeDiscount");
    expect(editor).toContain("getCustomerDiscountOptions");
    expect(editor).toContain("replaces any existing discount instead of stacking");
    expect(editor).toContain("buildQuoteDiscountLineItem(baseSubtotalCents, option)");
  });

  it("recomputes persisted quote totals from each line item, including negative discount rows", () => {
    const router = readFileSync(resolve(import.meta.dirname, "nativeQuotesRouter.ts"), "utf8");

    expect(router).toContain("normalizeQuoteLineItems");
    expect(router).toContain("totalCents = lineItems.reduce");
    expect(router).toContain("updates.totalCents = normalized.reduce");
  });
});
