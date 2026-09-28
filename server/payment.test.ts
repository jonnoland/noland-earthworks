/**
 * Payment router tests — verifies Stripe configuration check and
 * that the router procedures are correctly defined.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  lastCheckoutParams: null as Record<string, unknown> | null,
}));

// ─── Mock ENV before importing stripe.ts ─────────────────────────────────────

vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_fake_key_for_testing",
    stripeWebhookSecret: "whsec_test_fake",
    stripePublishableKey: "pk_test_fake",
    jwtSecret: "test_jwt_secret",
    databaseUrl: "mysql://test",
    builtInForgeApiKey: "test",
    builtInForgeApiUrl: "http://localhost",
  },
}));

// ─── Mock stripe package ──────────────────────────────────────────────────────

vi.mock("stripe", () => {
  const Stripe = vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_test123" }),
      retrieve: vi.fn().mockResolvedValue({ id: "cus_test123", deleted: false }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockImplementation(async (params: Record<string, unknown>) => {
          state.lastCheckoutParams = params;
          return {
            id: "cs_test_session123",
            url: "https://checkout.stripe.com/pay/cs_test_session123",
            payment_intent: "pi_test_invoice123",
          };
        }),
      },
    },
  }));
  return { default: Stripe };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("stripe helpers", () => {
  beforeEach(() => {
    state.lastCheckoutParams = null;
  });

  it("isStripeConfigured returns true when key is set", async () => {
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(true);
  });

  it("createCheckoutSession returns a session id and url", async () => {
    const { createCheckoutSession } = await import("./stripe");
    const result = await createCheckoutSession({
      jobId: 1,
      jobTitle: "Test Job",
      amountCents: 50000,
      type: "deposit",
      customerEmail: "test@example.com",
      customerName: "Test Customer",
      stripeCustomerId: "cus_test123",
      userId: 1,
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });
    expect(result.sessionId).toBe("cs_test_session123");
    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_session123");
  });

  it("creates invoice checkout links for card and ACH Direct Debit", async () => {
    const { createInvoiceCheckoutSession } = await import("./stripe");
    const result = await createInvoiceCheckoutSession({
      invoiceId: 42,
      jobId: 7,
      invoiceNumber: "INV-0042",
      amountCents: 125000,
      customerEmail: "client@example.com",
      customerName: "Client",
      successUrl: "https://nolandearthworks.com/?payment=success",
      cancelUrl: "https://nolandearthworks.com/?payment=cancelled",
    });
    expect(result).toMatchObject({
      sessionId: "cs_test_session123",
      url: "https://checkout.stripe.com/pay/cs_test_session123",
      paymentIntentId: "pi_test_invoice123",
    });
    expect(state.lastCheckoutParams?.payment_method_types).toEqual(["card", "us_bank_account"]);
    expect(state.lastCheckoutParams?.metadata).toMatchObject({
      native_invoice_id: "42",
      native_job_id: "7",
      payment_type: "invoice_balance",
    });
  });
});

describe("payment router structure", () => {
  it("paymentRouter exports expected procedures", async () => {
    const { paymentRouter } = await import("./paymentRouter");
    // The router should have these procedure keys
    const procedures = Object.keys(paymentRouter._def.procedures);
    expect(procedures).toContain("isConfigured");
    expect(procedures).toContain("createDepositSession");
    expect(procedures).toContain("createBalanceSession");
    expect(procedures).toContain("listMyPayments");
    expect(procedures).toContain("getJobPayments");
    expect(procedures).toContain("listJobPaymentSummaries");
  });
});
