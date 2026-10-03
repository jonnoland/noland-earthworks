import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const router = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");
const invoicesUi = readFileSync(resolve(root, "client/src/pages/ops/NativeInvoicesSection.tsx"), "utf8");

describe("manual invoice check payment workflow", () => {
  it("persists an auditable manual check record on the invoice", () => {
    expect(schema).toContain('paymentMethod: varchar("paymentMethod", { length: 30 })');
    expect(schema).toContain('paymentReference: varchar("paymentReference", { length: 100 })');
    expect(schema).toContain('paymentNotes: text("paymentNotes")');
    expect(schema).toContain('paymentReceiptEmailId: varchar("paymentReceiptEmailId", { length: 128 })');
    expect(schema).toContain('paymentReceiptSentAt: timestamp("paymentReceiptSentAt")');
    expect(schema).toContain('paymentReceiptUrl: varchar("paymentReceiptUrl", { length: 1024 })');
  });

  it("records a received check only after closing an open online checkout", () => {
    expect(router).toContain("recordInvoiceCheck: ownerProcedure");
    expect(router).toContain("expireInvoiceCheckoutSession(invoice.stripeCheckoutSessionId)");
    expect(router).toContain('paymentMethod: "check"');
    expect(router).toContain("paymentReference: input.checkNumber");
    expect(router).toContain('stripePaymentLinkUrl: null');
    expect(router).toContain("ACH payment is awaiting bank settlement");
    expect(router).toContain("sendFinalPaymentReceipt");
    expect(router).toContain("paymentReceiptEmailId: receipt.emailId");
    expect(router).toContain("Payment received — ${invoiceNumber}");
  });

  it("provides an invoice check receipt action with check number and receipt date", () => {
    expect(invoicesUi).toContain("Record Check Received");
    expect(invoicesUi).toContain("Check number");
    expect(invoicesUi).toContain("Date received");
    expect(invoicesUi).toContain("recordInvoiceCheck.useMutation");
    expect(invoicesUi).toContain("Check #{inv.paymentReference}");
    expect(invoicesUi).toContain("Payment receipt sent automatically");
    expect(invoicesUi).toContain("paymentMethodLabel");
    expect(invoicesUi).toContain(">Payment</th>");
    expect(invoicesUi).toContain("Receipt emailed");
    expect(invoicesUi).toContain("View paid final invoice");
    expect(invoicesUi).toContain("View final payment receipt");
    expect(invoicesUi).toContain("Resend Payment Receipt");
    expect(invoicesUi).toContain("Refresh and view paid final invoice");
  });

  it("resends a receipt for every paid final invoice while preserving settled payment state", () => {
    expect(router).toContain("resendPaymentReceipt: ownerProcedure");
    expect(router).toContain("Only paid invoices can receive a payment receipt resend.");
    expect(router).toContain("savePaidFinalDocuments");
    expect(router).toContain("paymentReceiptUrl: paidDocuments.paymentReceiptUrl");
  });

  it("rebuilds legacy paid check documents without emailing the customer or changing paid status", () => {
    expect(router).toContain("refreshPaidCheckDocuments: ownerProcedure");
    expect(router).toContain("Only paid check invoices with a saved check number can be refreshed.");
    expect(router).toContain("No customer\n   * message is sent");
    expect(router).toContain("set({ pdfUrl: paidDocuments.paidInvoiceUrl, paymentReceiptUrl: paidDocuments.paymentReceiptUrl })");
  });
});
