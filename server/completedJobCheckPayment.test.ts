import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const router = readFileSync(resolve(root, "server/nativeJobsRouter.ts"), "utf8");
const jobsUi = readFileSync(resolve(root, "client/src/pages/ops/NativeJobsSection.tsx"), "utf8");

describe("completed job check payment workflow", () => {
  it("creates the final invoice as paid without a Stripe checkout link when a check is already received", () => {
    expect(router).toContain('paymentMethod: z.enum(["online", "check"])');
    expect(router).toContain('const isCheckPayment = input.paymentMethod === "check"');
    expect(router).toContain('status: isCheckPayment ? "paid" : "unpaid"');
    expect(router).toContain('if (!isCheckPayment && isStripeConfigured() && totalCents > 0)');
    expect(router).toContain('paymentMethod: "check"');
    expect(router).toContain('finalPaymentStatus: "paid"');
  });

  it("optionally sends only a paid receipt after a direct check completion", () => {
    expect(router).toContain('if (isCheckPayment)');
    expect(router).toContain('sendCheckPaymentReceipt');
    expect(router).toContain('paymentReceiptEmailId: checkReceipt.emailId');
    expect(router).toContain('sendCheckReceipt: z.boolean().optional().default(true)');
  });

  it("shows the completed-job check path in the final invoice dialog", () => {
    expect(jobsUi).toContain('Check already received — record as paid');
    expect(jobsUi).toContain('Record Check & Mark Paid');
    expect(jobsUi).toContain('does not create or email a Stripe payment link');
    expect(jobsUi).toContain('Email a paid receipt instead of an invoice with a payment link');
  });
});
