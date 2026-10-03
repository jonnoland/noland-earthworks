import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const invoiceUiSource = readFileSync(resolve(root, "client/src/pages/ops/NativeInvoicesSection.tsx"), "utf8");
const jobsRouterSource = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");

describe("ACH payment-pending invoice status", () => {
  it("stores a dedicated ACH pending timestamp on invoices", () => {
    expect(schemaSource).toContain('achPaymentPendingAt: timestamp("achPaymentPendingAt")');
  });

  it("shows a distinct Payment Pending badge and settlement context in Operations", () => {
    expect(invoiceUiSource).toContain("Payment Pending");
    expect(invoiceUiSource).toContain("ACH submitted");
    expect(invoiceUiSource).toContain("Stripe has not confirmed the bank settlement yet.");
    expect(invoiceUiSource).toContain("!inv.achPaymentPendingAt");
  });

  it("clears the pending state if a cash payment is recorded", () => {
    expect(jobsRouterSource).toContain('status: "paid",');
    expect(jobsRouterSource).toContain("achPaymentPendingAt: null,");
    expect(jobsRouterSource).toContain('paymentMethod: "cash",');
  });
});
