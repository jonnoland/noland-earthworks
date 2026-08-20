import { describe, expect, it } from "vitest";
import { buildQuoteDiscountLineItem, getCustomerDiscountOptions, getSuggestedVolumeDiscount } from "./quoteDiscounts";

const settings = {
  volumeDiscount3to5Pct: 3,
  volumeDiscount5to10Pct: 7,
  volumeDiscount10plusPct: 10,
  discountMilitaryVeteranPct: 10,
  discountFirstTimePct: 10,
  discountReferralPct: 5,
  discountRepeatCustomerPct: 5,
  discountOffSeasonPct: 0,
  discountNonprofitGovPct: 0,
};

describe("controlled quote discounts", () => {
  it("suggests the configured tier without applying a volume discount below its threshold", () => {
    expect(getSuggestedVolumeDiscount(2.99, settings)).toBeNull();
    expect(getSuggestedVolumeDiscount(4, settings)).toMatchObject({ code: "volume_3_to_5", percent: 3 });
    expect(getSuggestedVolumeDiscount(7, settings)).toMatchObject({ code: "volume_5_to_10", percent: 7 });
    expect(getSuggestedVolumeDiscount(12, settings)).toMatchObject({ code: "volume_10_plus", percent: 10 });
  });

  it("shows enabled customer choices and creates a transparent negative discount line", () => {
    const options = getCustomerDiscountOptions(settings);
    const military = options.find((option) => option.code === "military_veteran");
    expect(military).toMatchObject({ percent: 10 });
    expect(options.find((option) => option.code === "off_season")).toBeUndefined();
    expect(buildQuoteDiscountLineItem(10_000, military!)).toMatchObject({ unitPriceCents: -1000, totalCents: -1000, kind: "discount" });
  });
});
