import { buildQuoteCostBreakdown, type QuoteBreakdownLineItem } from "./quoteCostBreakdown";

export interface QuotePortalLineItem extends QuoteBreakdownLineItem {
  description: string;
  totalCents: number;
  discountCode?: string;
}

export function getQuotePortalPhaseSummary(items: QuotePortalLineItem[]) {
  const breakdown = buildQuoteCostBreakdown(items);
  const isDiscount = (item: QuotePortalLineItem) => item.kind === "discount" || item.unitPriceCents < 0;
  const approvedLineItems = items.filter((item) => !isDiscount(item) && !(item.kind === "phase" && item.phaseAuthorization === "optional_future"));
  const optionalFutureLineItems = items.filter((item) => item.kind === "phase" && item.phaseAuthorization === "optional_future");

  return {
    approvedLineItems,
    optionalFutureLineItems,
    approvedDiscountCents: breakdown.approvedDiscountCents,
    optionalDiscountCents: breakdown.optionalDiscountCents,
    phaseOneTotalCents: breakdown.amountDueNowCents,
    optionalFutureTotalCents: Math.max(0, breakdown.allPhasesTotalCents - breakdown.amountDueNowCents),
    allPhasesTotalCents: breakdown.allPhasesTotalCents,
    hasOptionalFuturePhases: optionalFutureLineItems.length > 0,
  };
}
