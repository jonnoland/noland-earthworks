import { describe, expect, it } from "vitest";
import { buildCheckPaymentReceiptHtml, buildInvoiceHtml } from "./nativeJobsRouter";

describe("paid check invoice documents", () => {
  const paidAt = new Date("2026-10-03T12:00:00.000Z");

  it("renders a final invoice as paid rather than outstanding", () => {
    const html = buildInvoiceHtml({
      invoiceNumber: "INV-0042",
      job: {
        clientName: "Ken Sawyer",
        clientEmail: "ken@example.com",
        propertyAddress: "123 Pasture Road",
        serviceType: "Forestry Mulching",
      },
      lineItems: [{ description: "Forestry Mulching", qty: 1, unitPriceCents: 250000, totalCents: 250000 }],
      subtotalCents: 250000,
      depositPaidCents: 0,
      totalCents: 250000,
      paymentStatus: { method: "check", reference: "1050", paidAt },
    });

    expect(html).toContain("Paid Invoice");
    expect(html).toContain("Balance Paid");
    expect(html).toContain("Paid by check #1050");
    expect(html).not.toContain("Pay Invoice Securely");
  });

  it("renders the same payment reference and amount in a viewable receipt", () => {
    const html = buildCheckPaymentReceiptHtml({
      invoice: { id: 42, clientName: "Ken Sawyer", clientEmail: "ken@example.com", totalCents: 250000 },
      checkNumber: "1050",
      paidAt,
    });

    expect(html).toContain("Payment Receipt");
    expect(html).toContain("Check #1050");
    expect(html).toContain("$2,500");
  });
});
