import { buildQuoteCostBreakdown, type QuoteBreakdownLineItem } from "./quoteCostBreakdown";
import { ensureQuotePhaseIds, getQuotePhaseSections, type QuotePhaseSection } from "./quotePhaseSections";

export interface QuotePortalLineItem extends QuoteBreakdownLineItem {
  description: string;
  totalCents: number;
  phaseId?: string;
  estimatedDuration?: string;
  discountCode?: string;
}

export interface QuotePortalPhaseSection extends QuotePhaseSection<QuotePortalLineItem> {
  lineItems: QuotePortalLineItem[];
}

export function getQuotePortalPhaseSummary(items: QuotePortalLineItem[]) {
  const normalizedItems = ensureQuotePhaseIds(items);
  const breakdown = buildQuoteCostBreakdown(normalizedItems);
  const isDiscount = (item: QuotePortalLineItem) => item.kind === "discount" || item.unitPriceCents < 0;
  const phaseSections = getQuotePhaseSections(normalizedItems).map((section) => ({
    ...section,
    lineItems: section.itemIndices.map((index) => normalizedItems[index]),
  }));
  const approvedPhaseSections = phaseSections.filter((section) => section.phase.phaseAuthorization !== "optional_future");
  const optionalFuturePhaseSections = phaseSections.filter((section) => section.phase.phaseAuthorization === "optional_future");
  const assignedPhaseIds = new Set(phaseSections.map((section) => section.phase.phaseId));
  const unassignedApprovedLineItems = normalizedItems.filter((item) => !item.phaseId || !assignedPhaseIds.has(item.phaseId));
  const approvedLineItems = [
    ...approvedPhaseSections.flatMap((section) => section.lineItems),
    ...unassignedApprovedLineItems,
  ].filter((item) => !isDiscount(item));
  const optionalFutureLineItems = optionalFuturePhaseSections.flatMap((section) => section.lineItems);

  return {
    approvedPhaseSections,
    optionalFuturePhaseSections,
    unassignedApprovedLineItems,
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
