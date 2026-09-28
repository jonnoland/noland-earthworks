import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const quotesUi = readFileSync(resolve(root, "client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
const invoiceRouter = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");

describe("paid quote pipeline", () => {
  it("places a quote with final payment paid into the Paid pipeline section", () => {
    expect(quotesUi).toContain('key: "paid"');
    expect(quotesUi).toContain('label: "Paid"');
    expect(quotesUi).toContain('if (q.finalPaymentStatus === "paid" || q.status === "paid") return "paid";');
    expect(quotesUi).toContain('if (quote.finalPaymentStatus === "paid" || quote.status === "paid") return <Badge');
    expect(quotesUi).toContain('s.key === "paid"');
  });

  it("keeps paid quotes out of the active quote count", () => {
    expect(quotesUi).toContain('q.finalPaymentStatus !== "paid"');
  });

  it("moves a manually recorded final invoice payment back to the source quote", () => {
    expect(invoiceRouter).toContain('finalPaymentStatus: "paid"');
    expect(invoiceRouter).toContain('status: "paid"');
    expect(invoiceRouter).toContain('nextActionType: "final_payment_paid"');
    expect(invoiceRouter).toContain('where(eq(nativeQuotes.id, invoice.quoteId))');
  });
});
