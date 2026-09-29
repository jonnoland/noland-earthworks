import { describe, expect, it } from "vitest";
import { buildInvoiceEmailHtml } from "./nativeJobsRouter";

function renderInvoiceEmail(clientName: string) {
  return buildInvoiceEmailHtml({
    invoiceNumber: "TEST-0001",
    job: { clientName, serviceType: "Forestry Mulching" },
    lineItems: [{ description: "Forestry mulching", qty: 1, unitPriceCents: 285000, totalCents: 285000 }],
    subtotalCents: 285000,
    depositPaidCents: 0,
    totalCents: 285000,
    pdfUrl: "https://example.com/test-invoice",
    googleReviewUrl: "https://example.com/review",
  });
}

describe("final invoice review request personalization", () => {
  it("uses the customer first name above the review action", () => {
    const html = renderInvoiceEmail("Jordan Landowner");

    expect(html).toContain("Jordan, happy with the completed work?");
    expect(html).toContain("Leave a Google Review");
  });

  it("uses a neutral fallback when the customer name is blank", () => {
    expect(renderInvoiceEmail("   ")).toContain("there, happy with the completed work?");
  });
});
