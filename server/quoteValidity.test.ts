import { describe, expect, it } from "vitest";
import { QUOTE_VALIDITY_DAYS, getQuoteValidUntil, isQuoteExpiredForCustomer, quoteValidityMessage } from "./quoteValidity";

const sentQuote = (portalSentAt: Date, overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 101,
  status: "sent",
  portalSentAt,
  clientAction: null,
  convertedToJobAt: null,
  depositPaidAt: null,
  ...overrides,
}) as any;

describe("native quote validity policy", () => {
  it("sets an exact thirty-day validity window from the customer send date", () => {
    const sentAt = new Date("2026-09-01T15:30:00.000Z");
    const validUntil = getQuoteValidUntil(sentAt);

    expect(QUOTE_VALIDITY_DAYS).toBe(30);
    expect(validUntil?.toISOString()).toBe("2026-10-01T15:30:00.000Z");
    expect(quoteValidityMessage(validUntil!)).toContain("valid for 30 days through October 1, 2026");
  });

  it("expires only an unaccepted sent quote after the thirty-day window", () => {
    const sentAt = new Date("2026-09-01T15:30:00.000Z");

    expect(isQuoteExpiredForCustomer(sentQuote(sentAt), new Date("2026-10-01T15:29:59.999Z"))).toBe(false);
    expect(isQuoteExpiredForCustomer(sentQuote(sentAt), new Date("2026-10-01T15:30:00.000Z"))).toBe(true);
    expect(isQuoteExpiredForCustomer(sentQuote(sentAt, { clientAction: "changes_requested" }), new Date("2026-10-02T00:00:00.000Z"))).toBe(true);
    expect(isQuoteExpiredForCustomer(sentQuote(sentAt, { status: "approved", clientAction: "approved" }), new Date("2026-10-02T00:00:00.000Z"))).toBe(false);
    expect(isQuoteExpiredForCustomer(sentQuote(sentAt, { convertedToJobAt: new Date() }), new Date("2026-10-02T00:00:00.000Z"))).toBe(false);
  });
});
