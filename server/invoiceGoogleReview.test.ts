import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const invoiceRouter = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");
const reviewUrl = readFileSync(resolve(root, "shared/googleReview.ts"), "utf8");

describe("final invoice Google review link", () => {
  it("uses the saved Operations review URL with a verified default fallback", () => {
    expect(invoiceRouter).toContain("businessSettings.googleReviewUrl");
    expect(invoiceRouter).toContain("settings?.googleReviewUrl?.trim() || GOOGLE_REVIEW_URL");
    expect(reviewUrl).toContain("https://search.google.com/local/writereview?placeid=");
  });

  it("includes the review request in both first-send and resend final invoice emails", () => {
    expect(invoiceRouter.match(/googleReviewUrl,/g)?.length).toBeGreaterThanOrEqual(2);
    expect(invoiceRouter).toContain("Happy with the completed work?");
    expect(invoiceRouter).toContain("Leave a Google Review");
    expect(invoiceRouter).toContain('href="${esc(p.googleReviewUrl)}"');
  });

  it("keeps the review action separate from the card and ACH payment action", () => {
    expect(invoiceRouter).toContain("Pay by Card or ACH");
    expect(invoiceRouter).toContain("Online payment accepts card or ACH bank transfer.");
    expect(invoiceRouter).toContain("A quick Google review helps other landowners make a confident decision");
  });
});
