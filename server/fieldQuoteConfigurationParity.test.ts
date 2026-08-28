import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("Noland Field quote configuration parity", () => {
  it("uses live Operations settings for condition adjustments and eligible discount options", () => {
    const router = source("server/fieldQuoteRouter.ts");

    expect(router).toContain("calculateOperationsQuotePricing");
    expect(router).toContain("getPricingBenchmarks");
    expect(router).toContain("Live Operations minimum");
    expect(router).not.toContain("conditionAdjustedPrice.customerPriceLow");
    expect(router).toContain("getSuggestedVolumeDiscount(input.sourceAcreage ?? input.acreage ?? 0, pricingSettings)");
    expect(router).toContain("getCustomerDiscountOptions(pricingSettings)");
    expect(router).toContain("The selected discount is not enabled or eligible");
    expect(router).toContain("roundQuoteCentsUp(liveOperationsPricing.customerPriceLow * 100)");
  });

  it("shows selected Operations discounts and whole-dollar price ranges in Noland Field", () => {
    const mobile = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(mobile).toContain("Optional Operations discount");
    expect(mobile).toContain("selectedDiscountCode");
    expect(mobile).toContain("formatQuoteCents(Math.ceil(estimate.customerPriceLow) * 100)");
    expect(mobile).toContain("Remove discount");
    expect(mobile).toContain("onClick={() => handleGetEstimate()}");
    expect(mobile).not.toContain("onClick={handleGetEstimate}");
  });

  it("keeps saved-client selection PIN-protected and contact-only in Noland Field", () => {
    const router = source("server/fieldQuoteRouter.ts");
    const mobile = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(router).toContain("mobileClients: requireAppToken");
    expect(router).toContain("listNativeClientContacts(input)");
    expect(mobile).toContain("Existing client (optional)");
    expect(mobile).toContain("selectExistingClient");
    expect(mobile).toContain("window.confirm");
  });

  it("matches Operations Linear Foot measurement and acreage conversion behavior in Noland Field", () => {
    const router = source("server/fieldQuoteRouter.ts");
    const mobile = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const detail = source("noland-earthworks-mobile/src/pages/QuoteDetail.tsx");
    const offlineQueue = source("noland-earthworks-mobile/src/lib/offlineFieldQuoteQueue.ts");

    expect(router).toContain("calculateLinearFeetFromAcreage");
    expect(router).toContain("quantitySource: z.enum([\"measured\", \"acreage_estimate\"])" );
    expect(router).toContain("Verify footage on site before finalizing the quote.");
    expect(mobile).toContain("Calculate from acreage");
    expect(mobile).toContain("LINEAR_FOOT_CLEARING_WIDTH_OPTIONS");
    expect(mobile).toContain("Estimated footage — verify on site.");
    expect(mobile).toContain("Acres × 43,560 ÷ width = estimated Linear Feet.");
    expect(detail).toContain("Estimated footage — verify on site.");
    expect(offlineQueue).toContain("quantitySource?: \"measured\" | \"acreage_estimate\"");
  });

  it("retains a protected cached Operations pricing fallback with a clear rate source indicator", () => {
    const router = source("server/fieldQuoteRouter.ts");
    const mobile = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const offlinePricing = source("noland-earthworks-mobile/src/lib/offlinePricingCache.ts");
    const sharedOfflinePricing = source("shared/fieldOfflinePricing.ts");

    expect(router).toContain("pricingSnapshot: requireAppToken.query");
    expect(router).toContain("type OperationsQuotePricingSettings");
    expect(router).toContain("trailUnitRateCents");
    expect(router).toContain("fenceLineUnitRateCents");
    expect(router).toContain("sourceUpdatedAt");
    expect(offlinePricing).toContain("noland_field_operations_pricing_v1");
    expect(offlinePricing).toContain("calculateCachedFieldEstimate");
    expect(sharedOfflinePricing).toContain("calculateOperationsQuotePricing");
    expect(mobile).toContain("calculateCachedFieldEstimate");
    expect(mobile).toContain("Offline — cached Operations rates");
    expect(mobile).toContain("Live Operations rates");
    expect(mobile).toContain("Last synced:");
    expect(mobile).toContain("Verify live rates before sending the quote.");
    expect(mobile).toContain("showRateSyncNow");
    expect(mobile).toContain("pricingSnapshotQuery.refetch()");
    expect(mobile).toContain("Sync Now");
    expect(mobile).toContain("Operations rates synced");
  });
});
