import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuoteDiscountLineItem, getCustomerDiscountOptions, getSuggestedVolumeDiscount } from "../shared/quoteDiscounts";

describe("quote discount line items", () => {
  it("allows multiple distinct volume and customer discount line items in the quote editor", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");

    expect(editor).toContain("Optional discount line item");
    expect(editor).toContain("getSuggestedVolumeDiscount");
    expect(editor).toContain("getCustomerDiscountOptions");
    expect(editor).toContain("Apply each eligible discount once");
    expect(editor).toContain("buildQuoteDiscountLineItem(baseSubtotalCents, option)");
    expect(editor).toContain("const appliedDiscountCodes");
    expect(editor).toContain("lineItems: [...previous.lineItems, discountLine]");
    expect(editor).toContain("appliedDiscountCodes.has(option.code)");
  });

  it("recomputes persisted quote totals from each line item, including negative discount rows", () => {
    const router = readFileSync(resolve(import.meta.dirname, "nativeQuotesRouter.ts"), "utf8");

    expect(router).toContain("normalizeQuoteLineItems");
    expect(router).toContain("totalCents = lineItems.reduce");
    expect(router).toContain("updates.totalCents = normalized.reduce");
  });

  it("normalizes legacy or edited quote line-item cents before submitting an update", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");

    expect(editor).toContain("function normalizeQuoteLineItemsForSave");
    expect(editor).toContain("const lineItems = normalizeQuoteLineItemsForSave(form.lineItems)");
    expect(editor).toContain("totalCents: normalizedTotalCents");
  });

  it("keeps multiple distinct discounts as separate negative lines in the quote total", () => {
    const settings = {
      volumeDiscount3to5Pct: 3,
      discountMilitaryVeteranPct: 10,
      discountFirstTimePct: 10,
    };
    const options = getCustomerDiscountOptions(settings);
    const military = options.find((option) => option.code === "military_veteran");
    const firstTime = options.find((option) => option.code === "first_time");
    const volume = getSuggestedVolumeDiscount(4, settings);
    const baseSubtotalCents = 10_000;
    const discounts = [military, firstTime, volume].map((option) => buildQuoteDiscountLineItem(baseSubtotalCents, option!));

    expect(discounts.map((item) => item.totalCents)).toEqual([-1000, -1000, -300]);
    expect(baseSubtotalCents + discounts.reduce((sum, item) => sum + item.totalCents, 0)).toBe(7700);
  });
});
