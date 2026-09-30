import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { nativeQuotes, type NativeQuote } from "../drizzle/schema";

export const QUOTE_VALIDITY_DAYS = 30;
export const QUOTE_VALIDITY_MS = QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

// Older quote records can retain a draft lifecycle status after a customer portal
// was sent. The Quotes pipeline correctly presents those as Sent from portalSentAt,
// so the automatic expiry rule must treat both records the same way.
const QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE = ["sent", "draft"] as const;

type QuoteValidityRecord = Pick<NativeQuote, "id" | "status" | "portalSentAt" | "clientAction" | "convertedToJobAt" | "depositPaidAt">;

export function getQuoteValidUntil(portalSentAt: Date | null | undefined): Date | null {
  if (!portalSentAt) return null;
  return new Date(new Date(portalSentAt).getTime() + QUOTE_VALIDITY_MS);
}

export function isQuoteExpiredForCustomer(quote: QuoteValidityRecord, now = new Date()): boolean {
  const validUntil = getQuoteValidUntil(quote.portalSentAt);
  return Boolean(
    validUntil
    && now.getTime() >= validUntil.getTime()
    && QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE.includes(quote.status as typeof QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE[number])
    && (!quote.clientAction || quote.clientAction === "changes_requested")
    && !quote.convertedToJobAt
    && !quote.depositPaidAt,
  );
}

export const EXPIRED_QUOTE_UPDATE = {
  status: "expired",
  proposalStatus: "declined",
  nextActionType: "quote_expired",
  nextActionDueAt: null,
  // A later reassessment must issue a fresh customer portal link.
  portalToken: null,
} as const;

/**
 * Expires one unaccepted customer-sent quote when its 30-day validity window has passed.
 * The conditional update keeps this safe if a client approves it at the same time.
 */
export async function expireQuoteIfNeeded(db: any, quote: QuoteValidityRecord, now = new Date()): Promise<boolean> {
  if (!isQuoteExpiredForCustomer(quote, now)) return false;
  await db
    .update(nativeQuotes)
    .set(EXPIRED_QUOTE_UPDATE)
    .where(and(eq(nativeQuotes.id, quote.id), inArray(nativeQuotes.status, [...QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE])));
  return true;
}

/** Expires all customer-sent, unaccepted quotes whose validity window has elapsed. */
export async function expireStaleNativeQuotes(db: any, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - QUOTE_VALIDITY_MS);
  await db
    .update(nativeQuotes)
    .set(EXPIRED_QUOTE_UPDATE)
    .where(and(
      inArray(nativeQuotes.status, [...QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE]),
      lt(nativeQuotes.portalSentAt, cutoff),
      or(isNull(nativeQuotes.clientAction), eq(nativeQuotes.clientAction, "changes_requested")),
      isNull(nativeQuotes.convertedJobId),
      isNull(nativeQuotes.depositPaidAt),
    ));
}

export function quoteValidityMessage(validUntil: Date): string {
  return `This quote is valid for ${QUOTE_VALIDITY_DAYS} days through ${validUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. After that date, I will reassess the scope and pricing before issuing an updated quote.`;
}
