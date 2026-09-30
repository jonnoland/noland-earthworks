import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("thirty-day quote expiration workflow", () => {
  it("expires unaccepted sent quotes in the app scheduler and during quote workspace access", () => {
    const policy = read("server/quoteValidity.ts");
    const router = read("server/nativeQuotesRouter.ts");
    const server = read("server/_core/index.ts");

    expect(policy).toContain("QUOTE_VALIDITY_DAYS = 30");
    expect(policy).toContain('QUOTE_STATUSES_ELIGIBLE_TO_EXPIRE = ["sent", "draft"]');
    expect(policy).toContain('status: "expired"');
    expect(policy).toContain('nextActionType: "quote_expired"');
    expect(policy).toContain("expireStaleNativeQuotes");
    expect(router).toContain("await expireStaleNativeQuotes(db)");
    expect(server).toContain('cron.schedule("5 0 * * *"');
  });

  it("includes the validity date in customer-facing quote email and portal/PDF content", () => {
    const policy = read("server/quoteValidity.ts");
    const router = read("server/nativeQuotesRouter.ts");
    const portal = read("client/src/pages/NativeQuotePortal.tsx");

    expect(router).toContain("quoteValidityMessage(validUntil)");
    expect(policy).toContain("This quote is valid for ${QUOTE_VALIDITY_DAYS} days");
    expect(router).toContain("validUntil: getQuoteValidUntil(quote.portalSentAt)");
    expect(portal).toContain("Quote validity:");
    expect(portal).toContain("valid for 30 days through");
  });

  it("requires an expired quote to be restored to draft before reassessment and a new send", () => {
    const router = read("server/nativeQuotesRouter.ts");
    const workspace = read("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain('existingQuote.status === "expired" && input.status !== "draft"');
    expect(router).toContain('updates.nextActionType = "reassess_expired_quote"');
    expect(router).toContain('quote.status === "expired" || await expireQuoteIfNeeded(db, quote)');
    expect(workspace).toContain('key: "expired"');
    expect(workspace).toContain('label: "Expired"');
    expect(workspace).toContain("Restore to Draft for Reassessment");
  });
});
