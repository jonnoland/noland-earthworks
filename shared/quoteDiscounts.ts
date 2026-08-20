export type QuoteDiscountCode =
  | "volume_3_to_5"
  | "volume_5_to_10"
  | "volume_10_plus"
  | "military_veteran"
  | "first_time"
  | "referral"
  | "repeat_customer"
  | "off_season"
  | "nonprofit_government";

export type QuoteDiscountSettings = {
  volumeDiscount3to5Pct?: number | null;
  volumeDiscount5to10Pct?: number | null;
  volumeDiscount10plusPct?: number | null;
  discountMilitaryVeteranPct?: number | null;
  discountFirstTimePct?: number | null;
  discountReferralPct?: number | null;
  discountRepeatCustomerPct?: number | null;
  discountOffSeasonPct?: number | null;
  discountNonprofitGovPct?: number | null;
};

export type QuoteDiscountOption = {
  code: QuoteDiscountCode;
  label: string;
  percent: number;
  eligibility: string;
};

const positiveWholePercent = (value: number | null | undefined) => Math.max(0, Math.round(value ?? 0));

export function getSuggestedVolumeDiscount(acres: number, settings: QuoteDiscountSettings): QuoteDiscountOption | null {
  if (!Number.isFinite(acres) || acres < 3) return null;
  if (acres >= 10) {
    const percent = positiveWholePercent(settings.volumeDiscount10plusPct);
    return percent ? { code: "volume_10_plus", label: "Volume Discount", percent, eligibility: "10+ acres" } : null;
  }
  if (acres >= 5) {
    const percent = positiveWholePercent(settings.volumeDiscount5to10Pct);
    return percent ? { code: "volume_5_to_10", label: "Volume Discount", percent, eligibility: "5–9.99 acres" } : null;
  }
  const percent = positiveWholePercent(settings.volumeDiscount3to5Pct);
  return percent ? { code: "volume_3_to_5", label: "Volume Discount", percent, eligibility: "3–4.99 acres" } : null;
}

export function getCustomerDiscountOptions(settings: QuoteDiscountSettings): QuoteDiscountOption[] {
  const options: Array<[QuoteDiscountCode, string, number | null | undefined, string]> = [
    ["military_veteran", "Military / Veteran Discount", settings.discountMilitaryVeteranPct, "Customer confirms eligible military or veteran status"],
    ["first_time", "First-Time Customer Discount", settings.discountFirstTimePct, "First completed job for this customer"],
    ["referral", "Referral Discount", settings.discountReferralPct, "Confirmed qualifying referral"],
    ["repeat_customer", "Repeat Customer Discount", settings.discountRepeatCustomerPct, "Customer has 3+ completed jobs"],
    ["off_season", "Off-Season Discount", settings.discountOffSeasonPct, "Owner-approved slow-season booking"],
    ["nonprofit_government", "Nonprofit / Government Discount", settings.discountNonprofitGovPct, "Owner-approved eligible organization"],
  ];
  return options.flatMap(([code, label, value, eligibility]) => {
    const percent = positiveWholePercent(value);
    return percent ? [{ code, label, percent, eligibility }] : [];
  });
}

export function buildQuoteDiscountLineItem(subtotalCents: number, option: QuoteDiscountOption) {
  const base = Math.max(0, Math.round(subtotalCents));
  const amountCents = Math.round(base * option.percent / 100);
  return {
    description: `${option.label} (${option.percent}% — ${option.eligibility})`,
    qty: 1,
    unitPriceCents: -amountCents,
    totalCents: -amountCents,
    kind: "discount" as const,
    discountCode: option.code,
  };
}
