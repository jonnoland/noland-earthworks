import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateInvoiceRefund } from "./invoiceRefunds";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("final invoice refund workflow", () => {
  it("calculates partial and full refunds without allowing over-refunds", () => {
    expect(calculateInvoiceRefund(100_000, 0, 25_000)).toEqual({
      refundedCents: 25_000,
      remainingCents: 75_000,
      fullyRefunded: false,
    });
    expect(calculateInvoiceRefund(100_000, 25_000, 75_000)).toEqual({
      refundedCents: 100_000,
      remainingCents: 0,
      fullyRefunded: true,
    });
    expect(() => calculateInvoiceRefund(100_000, 25_000, 75_001)).toThrow("cannot exceed");
  });

  it("keeps an auditable refund ledger and aggregate fields on invoices", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("nativeInvoiceRefunds");
    expect(schema).toContain('status: mysqlEnum("status", ["unpaid", "sent", "paid", "refunded", "void"])');
    expect(schema).toContain("refundedCents");
    expect(schema).toContain("refundReference");
  });

  it("requires an explicit confirmation and reconciles invoices, jobs, and quotes", () => {
    const router = read("server/nativeJobsRouter.ts");
    expect(router).toContain("refundInvoice: ownerProcedure");
    expect(router).toContain("confirmRefund: z.literal(true)");
    expect(router).toContain("refundInvoicePayment(invoice.stripePaymentIntentId, input.amountCents)");
    expect(router).toContain("db.insert(nativeInvoiceRefunds)");
    expect(router).toContain('status: fullyRefunded ? "refunded" : "paid"');
    expect(router).toContain('finalPaymentStatus: fullyRefunded ? "refunded" : "partially_refunded"');
  });

  it("offers a guarded partial or full refund dialog and receipt access on every invoice", () => {
    const invoices = read("client/src/pages/ops/NativeInvoicesSection.tsx");
    expect(invoices).toContain("refundInvoice.useMutation");
    expect(invoices).toContain("confirmRefund: true");
    expect(invoices).toContain("Record or Process Refund");
    expect(invoices).toContain("Process Stripe Refund");
    expect(invoices).toContain("Final payment receipt is available once this invoice is paid");
    expect(invoices).toContain("refreshPaidDocuments.useMutation");
  });
});
