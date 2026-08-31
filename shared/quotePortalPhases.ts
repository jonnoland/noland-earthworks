import { buildQuoteCostBreakdown, type QuoteBreakdownLineItem } from "./quoteCostBreakdown";
import { getQuotePhaseSections, orderQuoteLineItemsWithDiscountsLast, type QuotePhaseSection } from "./quotePhaseSections";

export interface QuotePortalLineItem extends QuoteBreakdownLineItem {
  description: string;
  totalCents: number;
  phaseId?: string;
  estimatedDuration?: string;
  discountCode?: string;
  serviceCode?: string;
  measurementUnit?: "linear_foot";
  quantitySource?: "measured" | "acreage_estimate";
  sourceAcreage?: number;
  clearingWidthFeet?: number;
}

export interface QuotePortalPhaseSection extends QuotePhaseSection<QuotePortalLineItem> {
  lineItems: QuotePortalLineItem[];
}

/**
 * `includedApprovedCostCents` is a quote-wide customer charge for required equipment
 * and project costs. It is displayed as a customer-safe line in the current approval
 * so every visible quote total reconciles, while the raw rental cost and markup stay internal.
 */
export function getQuotePortalPhaseSummary(items: QuotePortalLineItem[], includedApprovedCostCents = 0) {
  const normalizedItems = orderQuoteLineItemsWithDiscountsLast(items);
  const breakdown = buildQuoteCostBreakdown(normalizedItems);
  const isDiscount = (item: QuotePortalLineItem) => item.kind === "discount" || item.unitPriceCents < 0;
  const phaseSections = getQuotePhaseSections(normalizedItems).map((section) => ({
    ...section,
    lineItems: section.itemIndices.map((index) => normalizedItems[index]),
  }));
  let approvedPhaseSections = phaseSections.filter((section) => section.phase.phaseAuthorization !== "optional_future");
  const optionalFuturePhaseSections = phaseSections.filter((section) => section.phase.phaseAuthorization === "optional_future");
  const assignedPhaseIds = new Set(phaseSections.map((section) => section.phase.phaseId));
  let unassignedApprovedLineItems = normalizedItems.filter((item) => !item.phaseId || !assignedPhaseIds.has(item.phaseId));
  const equipmentCostLine: QuotePortalLineItem | null = includedApprovedCostCents > 0
    ? {
      description: "Required Equipment & Project Costs",
      qty: 1,
      unitPriceCents: includedApprovedCostCents,
      totalCents: includedApprovedCostCents,
      kind: "service",
    }
    : null;

  if (equipmentCostLine) {
    if (approvedPhaseSections.length > 0) {
      approvedPhaseSections = approvedPhaseSections.map((section, index) => index === 0
        ? {
          ...section,
          lineItems: [
            ...section.lineItems.filter((item) => !isDiscount(item)),
            equipmentCostLine,
            ...section.lineItems.filter(isDiscount),
          ],
          subtotalCents: section.subtotalCents + includedApprovedCostCents,
          totalCents: section.totalCents + includedApprovedCostCents,
        }
        : section,
      );
    } else {
      unassignedApprovedLineItems = [
        ...unassignedApprovedLineItems.filter((item) => !isDiscount(item)),
        equipmentCostLine,
        ...unassignedApprovedLineItems.filter(isDiscount),
      ];
    }
  }
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
    phaseOneTotalCents: breakdown.amountDueNowCents + Math.max(0, includedApprovedCostCents),
    optionalFutureTotalCents: Math.max(0, breakdown.allPhasesTotalCents - breakdown.amountDueNowCents),
    allPhasesTotalCents: breakdown.allPhasesTotalCents + Math.max(0, includedApprovedCostCents),
    hasOptionalFuturePhases: optionalFutureLineItems.length > 0,
  };
}
