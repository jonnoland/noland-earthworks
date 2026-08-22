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
    expect(editor).toContain("Original subtotal");
    expect(editor).toContain("Total discounts");
    expect(editor).toContain("Final total");
    expect(editor).toContain('!top-1/2 !left-1/2');
    expect(editor).toContain('!-translate-x-1/2 !-translate-y-1/2');
    expect(editor).toContain('!w-[min(94vw,1280px)]');
    expect(editor).not.toContain('max-h-[90vh] overflow-y-auto');
    expect(editor).toContain('max-w-[1500px] grid-cols-1');
    expect(editor).toContain('Client message & internal notes');
    expect(editor).toContain('Pipeline & follow-up details');
    expect(editor).toContain('grid-cols-1 gap-2 rounded-lg');
    expect(editor).toContain('sm:grid-cols-2');
    expect(editor).toContain('sm:grid-cols-12');
    expect(editor).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]');
    expect(editor).toContain('lg:col-span-2');
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
