import type { QuoteLineItemKind, QuotePhaseAuthorization } from "./quoteWorkTypes";

export interface PhaseSectionLineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  kind?: QuoteLineItemKind;
  phaseId?: string;
  phaseAuthorization?: QuotePhaseAuthorization;
  estimatedDuration?: string;
  discountCode?: string;
}

export interface QuotePhaseSection<T extends PhaseSectionLineItem = PhaseSectionLineItem> {
  phase: T;
  itemIndices: number[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function ensureQuotePhaseIds<T extends PhaseSectionLineItem>(items: T[]): T[] {
  return items.map((item, index) => (
    item.kind === "phase" && !item.phaseId
      ? { ...item, phaseId: `phase-${index + 1}` }
      : item
  )) as T[];
}

function isDiscountLineItem(item: PhaseSectionLineItem) {
  return item.kind === "discount" || item.unitPriceCents < 0;
}

function discountLast<T extends PhaseSectionLineItem>(items: T[]) {
  return [
    ...items.filter((item) => !isDiscountLineItem(item)),
    ...items.filter(isDiscountLineItem),
  ];
}

/** Keeps discounts at the end of their standard quote or phase section. */
export function orderQuoteLineItemsWithDiscountsLast<T extends PhaseSectionLineItem>(items: T[]): T[] {
  const normalizedItems = ensureQuotePhaseIds(items);
  const phaseHeaders = normalizedItems.filter((item) => item.kind === "phase" && item.phaseId);
  const assignedPhaseIds = new Set(phaseHeaders.map((item) => item.phaseId));
  const ordered: T[] = [];

  for (const phase of phaseHeaders) {
    const sectionItems = normalizedItems.filter((item) => item !== phase && item.phaseId === phase.phaseId);
    ordered.push(phase, ...discountLast(sectionItems));
  }

  ordered.push(...discountLast(normalizedItems.filter((item) => !item.phaseId || !assignedPhaseIds.has(item.phaseId))));
  return ordered;
}

export function getQuotePhaseSections<T extends PhaseSectionLineItem>(items: T[]): QuotePhaseSection<T>[] {
  const phases = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === "phase" && item.phaseId);

  return phases.map(({ item: phase, index }) => {
    const itemIndices = items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => item.phaseId === phase.phaseId)
      .map(({ itemIndex }) => itemIndex);
    const sectionItems = itemIndices.map((itemIndex) => items[itemIndex]);
    const subtotalCents = sectionItems
      .filter((item) => item.kind !== "discount" && item.unitPriceCents >= 0)
      .reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    const discountCents = sectionItems
      .filter((item) => item.kind === "discount" || item.unitPriceCents < 0)
      .reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    return { phase, itemIndices, subtotalCents, discountCents, totalCents: subtotalCents + discountCents };
  });
}
