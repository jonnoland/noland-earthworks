import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("Noland Field quote configuration parity", () => {
  it("uses live Operations settings for condition adjustments and eligible discount options", () => {
    const router = source("server/fieldQuoteRouter.ts");

    expect(router).toContain("getSuggestedVolumeDiscount(input.acreage ?? 0, pricingSettings)");
    expect(router).toContain("getCustomerDiscountOptions(pricingSettings)");
    expect(router).toContain("The selected discount is not enabled or eligible");
    expect(router).toContain("roundQuoteCentsUp(conditionAdjustedPrice.customerPriceLow * 100)");
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
});
