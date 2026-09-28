import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const routerSource = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");
const stripeSource = readFileSync(resolve(root, "server/stripe.ts"), "utf8");
const invoiceUiSource = readFileSync(resolve(root, "client/src/pages/ops/NativeInvoicesSection.tsx"), "utf8");

describe("native invoice resend workflow", () => {
  it("offers an owner-only resend procedure for unpaid or sent invoices", () => {
    expect(routerSource).toContain("resendInvoice: ownerProcedure");
    expect(routerSource).toContain('invoice.status === "paid"');
    expect(routerSource).toContain('invoice.status === "void"');
    expect(routerSource).toContain("Add a customer email address before resending this invoice.");
  });

  it("retires the prior checkout and creates a fresh card and ACH payment link", () => {
    expect(routerSource).toContain("await expireInvoiceCheckoutSession(stripeCheckoutSessionId)");
    expect(routerSource).toContain("const checkout = await createInvoiceCheckoutSession");
    expect(stripeSource).toContain('payment_method_types: ["card", "us_bank_account"]');
    expect(stripeSource).toContain("checkout.sessions.expire(sessionId)");
  });

  it("regenerates the invoice document and records the resend delivery", () => {
    expect(routerSource).toContain("-resent.html");
    expect(routerSource).toContain("const emailHtml = buildInvoiceEmailHtml");
    expect(routerSource).toContain('status: "sent"');
    expect(routerSource).toContain("stripePaymentLinkUrl: paymentLinkUrl");
    expect(routerSource).toContain("emailSentAt");
  });

  it("provides a confirmed Resend Invoice action in Operations", () => {
    expect(invoiceUiSource).toContain("trpc.nativeJobs.resendInvoice.useMutation");
    expect(invoiceUiSource).toContain("Resend this invoice?");
    expect(invoiceUiSource).toContain("A fresh Stripe payment link will replace the previous link");
    expect(invoiceUiSource).toContain("Resend Invoice");
  });
});
