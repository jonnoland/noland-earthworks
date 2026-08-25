import type { QuoteLineItemKind, QuotePhaseAuthorization } from "./quoteWorkTypes";

export interface QuoteBreakdownLineItem {
  qty: number;
  unitPriceCents: number;
  kind?: QuoteLineItemKind;
  phaseAuthorization?: QuotePhaseAuthorization;
  phaseId?: string;
}

export interface QuoteCostBreakdown {
  standardServiceCents: number;
  approvedPhaseCents: number;
  optionalFuturePhaseCents: number;
  fullOperatingDayCents: number;
  halfOperatingDayCents: number;
  baseSubtotalCents: number;
  discountCents: number;
  approvedDiscountCents: number;
  optionalDiscountCents: number;
  amountDueNowCents: number;
  allPhasesTotalCents: number;
}

export interface QuoteCostDistributionSlice {
  name: "Approved work" | "Optional future phases";
  value: number;
  color: string;
}

function lineTotal(item: QuoteBreakdownLineItem) {
  return Math.round(Math.max(1, Number(item.qty) || 1) * (Number(item.unitPriceCents) || 0));
}

export function buildQuoteCostBreakdown(items: QuoteBreakdownLineItem[]): QuoteCostBreakdown {
  let standardServiceCents = 0;
  let approvedPhaseCents = 0;
  let optionalFuturePhaseCents = 0;
  let fullOperatingDayCents = 0;
  let halfOperatingDayCents = 0;
  let discountCents = 0;
  let scopedApprovedDiscountCents = 0;
  let scopedOptionalDiscountCents = 0;
  const phaseAuthorizationById = new Map<string, QuotePhaseAuthorization>();

  for (const item of items) {
    if (item.kind === "phase" && item.phaseId) {
      phaseAuthorizationById.set(item.phaseId, item.phaseAuthorization ?? "approved_now");
    }
  }

  for (const item of items) {
    const total = lineTotal(item);
    const scopedPhaseAuthorization = item.phaseId ? phaseAuthorizationById.get(item.phaseId) : undefined;
    if (item.kind === "discount" || total < 0) {
      if (scopedPhaseAuthorization === "optional_future") scopedOptionalDiscountCents += total;
      else if (scopedPhaseAuthorization === "approved_now") scopedApprovedDiscountCents += total;
      else discountCents += total;
      continue;
    }
    if (item.kind === "phase") {
      if (item.phaseAuthorization === "optional_future") optionalFuturePhaseCents += total;
      else approvedPhaseCents += total;
      continue;
    }
    if (scopedPhaseAuthorization === "optional_future") {
      optionalFuturePhaseCents += total;
      continue;
    }
    if (scopedPhaseAuthorization === "approved_now") {
      approvedPhaseCents += total;
      continue;
    }
    if (item.kind === "full_operating_day") {
      fullOperatingDayCents += total;
      continue;
    }
    if (item.kind === "half_operating_day") {
      halfOperatingDayCents += total;
      continue;
    }
    standardServiceCents += total;
  }

  const baseSubtotalCents = standardServiceCents + approvedPhaseCents + optionalFuturePhaseCents + fullOperatingDayCents + halfOperatingDayCents;
  const approvedWorkCents = standardServiceCents + approvedPhaseCents + fullOperatingDayCents + halfOperatingDayCents;
  const allocatedApprovedDiscountCents = baseSubtotalCents > 0
    ? Math.round(discountCents * (approvedWorkCents / baseSubtotalCents))
    : 0;
  const allocatedOptionalDiscountCents = discountCents - allocatedApprovedDiscountCents;
  const approvedDiscountCents = scopedApprovedDiscountCents + allocatedApprovedDiscountCents;
  const optionalDiscountCents = scopedOptionalDiscountCents + allocatedOptionalDiscountCents;

  return {
    standardServiceCents,
    approvedPhaseCents,
    optionalFuturePhaseCents,
    fullOperatingDayCents,
    halfOperatingDayCents,
    baseSubtotalCents,
    discountCents: discountCents + scopedApprovedDiscountCents + scopedOptionalDiscountCents,
    approvedDiscountCents,
    optionalDiscountCents,
    amountDueNowCents: approvedWorkCents + approvedDiscountCents,
    allPhasesTotalCents: baseSubtotalCents + discountCents + scopedApprovedDiscountCents + scopedOptionalDiscountCents,
  };
}

export function getQuoteCostDistribution(breakdown: QuoteCostBreakdown): QuoteCostDistributionSlice[] {
  const approvedWork = Math.max(0, breakdown.amountDueNowCents);
  const optionalFuturePhases = Math.max(0, breakdown.allPhasesTotalCents - approvedWork);
  return [
    { name: "Approved work", value: approvedWork, color: "#f59e0b" },
    { name: "Optional future phases", value: optionalFuturePhases, color: "#818cf8" },
  ];
}
